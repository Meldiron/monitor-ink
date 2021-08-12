import { Select, Selector, State } from '@ngxs/store';
import { DataAction, StateRepository } from '@ngxs-labs/data/decorators';
import { NgxsDataRepository } from '@ngxs-labs/data/repositories';
import { Injectable } from '@angular/core';
import produce from 'immer';
import {
  AppwriteGroup,
  AppwritePing,
  AppwriteProject,
  AppwriteService,
  AppwriteSetting,
} from '../appwrite.service';

export type DataStateStatus = {
  status: 'slow' | 'up' | 'down';
  responseTime: number;
};

export type DataStateComplexStatus = {
  status: string;
  percentageUp: number;
  statusAmount: number;
};

export type DataStateProject = {
  sort: number;

  $id: string;
  name: string;
  url: string;

  mainStatuses: DataStateStatus[];
  latestStatus: DataStateStatus;
};

export type DataStateGroup = {
  sort: number;

  $id: string;
  name: string;
  projects: DataStateProject[];
};

export type DataStateModel = {
  groups: DataStateGroup[];
  settings: DataStateSettings | null;
};

export type DataStateSettings = {
  contactEmail: string;
  contactPhone: string;
  brandingTitle: string;
  brandingDescription: string;
  brandingLogoSrc: string;
};

@StateRepository()
@State<DataStateModel>({
  name: 'data',
  defaults: {
    groups: [],
    settings: null,
  },
})
@Injectable()
export class DataState extends NgxsDataRepository<DataStateModel> {
  @Selector()
  static getTotalOfStatus(
    state: DataStateModel,
    status?: 'up' | 'down' | 'slow'
  ): number {
    let total = 0;

    for (const group of state.groups) {
      const groupStatus = DataState.groupStatus(state, group.$id);

      if (!status || groupStatus.status === status) {
        total += groupStatus.statusAmount;
      }
    }

    return total;
  }

  static getOverallStatus(state: DataStateModel): {
    status: 'slow' | 'up' | 'down';
    amount: number;
  } {
    let totalDown = 0;
    let totalUp = 0;
    let totalSlow = 0;

    for (const group of state.groups) {
      const groupStatus = DataState.groupStatus(state, group.$id);

      if (groupStatus.status === 'slow') {
        totalSlow += groupStatus.statusAmount;
      } else if (groupStatus.status === 'up') {
        totalUp += groupStatus.statusAmount;
      } else if (groupStatus.status === 'down') {
        totalDown += groupStatus.statusAmount;
      }
    }

    if (totalDown > 0) {
      return {
        amount: totalDown,
        status: 'down',
      };
    } else if (totalSlow > 0) {
      return {
        amount: totalSlow,
        status: 'slow',
      };
    } else {
      return {
        amount: totalUp,
        status: 'up',
      };
    }
  }

  @Selector()
  static projectStatus(
    state: DataStateModel,
    projectId: string
  ): DataStateComplexStatus {
    const resultStatus: DataStateComplexStatus = {
      status: 'up',
      percentageUp: 100,
      statusAmount: 0,
    };

    for (const group of state.groups) {
      for (const project of group.projects) {
        if (project.$id === projectId) {
          const upPings = [];
          const downPings = [];
          const slowPings = [];

          let totalPings = 0;
          let upPingsTotal = 0;

          for (const ping of project.mainStatuses) {
            totalPings++;

            if (ping.status === 'slow') {
              upPingsTotal++;
              slowPings.push(ping);
            } else if (ping.status === 'down') {
              downPings.push(ping);
            } else if (ping.status === 'up') {
              upPingsTotal++;
              upPings.push(ping);
            }
          }

          const percentageUp =
            totalPings === 0 ? 100 : (upPingsTotal / totalPings) * 100;

          resultStatus.percentageUp = percentageUp;
          resultStatus.status = project.latestStatus.status;
          resultStatus.statusAmount = 1;

          return resultStatus;
        }
      }
    }

    return resultStatus;
  }

  @Selector()
  static groupStatus(
    state: DataStateModel,
    groupId: string
  ): DataStateComplexStatus {
    const resultStatus: DataStateComplexStatus = {
      status: 'up',
      percentageUp: 100,
      statusAmount: 0,
    };

    const group = state.groups.find((g) => g.$id === groupId);

    if (!group) {
      return resultStatus;
    }

    const upProjects = [];
    const downProjects = [];
    const slowProjects = [];

    let totalUp = 0;
    let totalUpPercentage = 0;

    for (const project of group.projects) {
      const projectStatus = DataState.projectStatus(state, project.$id);

      totalUpPercentage += projectStatus.percentageUp;
      totalUp++;
      if (projectStatus.status === 'slow') {
        slowProjects.push({
          percentageUp: projectStatus.percentageUp,
          ...project,
        });
      } else if (projectStatus.status === 'up') {
        upProjects.push({
          percentageUp: projectStatus.percentageUp,
          ...project,
        });
      } else if (projectStatus.status === 'down') {
        downProjects.push({
          percentageUp: projectStatus.percentageUp,
          ...project,
        });
      }
    }

    const percentageUp = totalUp === 0 ? 100 : totalUpPercentage / totalUp;

    if (downProjects.length > 0) {
      resultStatus.status = 'down';
      resultStatus.statusAmount = downProjects.length;
      resultStatus.percentageUp = percentageUp;
    } else if (slowProjects.length > 0) {
      resultStatus.status = 'slow';
      resultStatus.statusAmount = slowProjects.length;
      resultStatus.percentageUp = percentageUp;
    } else {
      resultStatus.status = 'up';
      resultStatus.statusAmount = upProjects.length;
      resultStatus.percentageUp = percentageUp;
    }

    return resultStatus;
  }

  @DataAction() async reloadMainStatus() {
    const db = this.appwriteService.sdk.database;

    const { documents: groupsDocuments } = await db.listDocuments(
      this.appwriteService.ids.groups,
      undefined,
      100,
      0,
      '$id',
      'DESC'
    ); // TODO: Pagination

    const groupsArray: AppwriteGroup[] = groupsDocuments;

    const groupsWithProjects = await Promise.all(
      groupsArray.map(async (group) => {
        const groupId = group.$id;

        const { documents: projectsDocuments } = await db.listDocuments(
          this.appwriteService.ids.projects,
          ['groupId=' + groupId],
          100,
          0,
          '$id',
          'DESC'
        ); // TODO: Pagination

        const projectsArray: AppwriteProject[] = projectsDocuments;

        return {
          ...group,
          projects: await Promise.all(
            projectsArray.map(async (project) => {
              const projectId = project.$id;
              const { documents: pingsDocuments } = await db.listDocuments(
                this.appwriteService.ids.pings,
                ['projectId=' + projectId],
                60,
                0,
                '$id',
                'DESC'
              );

              const projectPings: AppwritePing[] = pingsDocuments;

              return {
                ...project,
                mainPings: projectPings.reverse(),
              };
            })
          ),
        };
      })
    );

    this.ctx.setState(
      produce(this.ctx.getState(), (draft) => {
        for (const group of groupsWithProjects) {
          let draftGroup = draft.groups.find((g) => g.$id === group.$id);

          if (!draftGroup) {
            draft.groups.push({
              $id: group.$id,
              name: group.name,
              sort: group.sort,
              projects: [],
            });

            draftGroup = draft.groups[draft.groups.length - 1];
          }

          for (const project of group.projects) {
            let draftProject = draftGroup.projects.find(
              (p) => p.$id === project.$id
            );

            if (!draftProject) {
              const latestPing =
                project.mainPings[project.mainPings.length - 1];

              draftGroup.projects.push({
                $id: project.$id,
                name: project.name,
                sort: project.sort,
                url: project.url,

                mainStatuses: project.mainPings.map((ping) => {
                  return {
                    status: ping.status,
                    responseTime: ping.responseTime,
                  };
                }),

                latestStatus: latestPing
                  ? {
                      status: latestPing.status,
                      responseTime: latestPing.responseTime,
                    }
                  : {
                      status: 'up',
                      responseTime: 0,
                    },
              });
            } else {
              const latestPing =
                project.mainPings[project.mainPings.length - 1];

              draftProject.mainStatuses = project.mainPings.map((ping) => {
                return {
                  status: ping.status,
                  responseTime: ping.responseTime,
                };
              });

              draftProject.latestStatus = latestPing
                ? {
                    status: latestPing.status,
                    responseTime: latestPing.responseTime,
                  }
                : {
                    status: 'up',
                    responseTime: 0,
                  };
            }
          }
        }

        draft.groups = draft.groups.sort((a, b) => (a.sort > b.sort ? -1 : 1));
        for (const draftGroup of draft.groups) {
          draftGroup.projects = draftGroup.projects.sort((a, b) =>
            a.sort > b.sort ? -1 : 1
          );
        }
      })
    );
  }

  @DataAction() async reloadSettings() {
    const { documents: settingsDocuments } =
      await this.appwriteService.sdk.database.listDocuments(
        this.appwriteService.ids.settings,
        [],
        1,
        0,
        '$id',
        'DESC'
      );
    const settingsDocument: AppwriteSetting | undefined = settingsDocuments[0];

    if (!settingsDocument) {
      return;
    }

    this.ctx.setState(
      produce(this.ctx.getState(), (draft) => {
        draft.settings = {
          brandingDescription: settingsDocument.brandingDescription,
          brandingLogoSrc: settingsDocument.brandingLogoSrc,
          brandingTitle: settingsDocument.brandingTitle,
          contactEmail: settingsDocument.contactEmail,
          contactPhone: settingsDocument.contactPhone,
        };
      })
    );
  }

  constructor(private appwriteService: AppwriteService) {
    super();
  }
}
