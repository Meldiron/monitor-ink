import { Select, Selector, State } from '@ngxs/store';
import { DataAction, StateRepository } from '@ngxs-labs/data/decorators';
import { NgxsDataRepository } from '@ngxs-labs/data/repositories';
import { Injectable } from '@angular/core';
import produce from 'immer';
import {
  AppwriteDailyPing,
  AppwriteGroup,
  AppwritePing,
  AppwriteProject,
  AppwriteService,
  AppwriteSetting,
} from '../appwrite.service';

// export type DataStateStatus = {
//   status: 'slow' | 'up' | 'down' | 'loading';
//   responseTime: number;
// };

export type DateStateDetailedProject = {
  uptime24h: number;
  uptime7d: number;

  calendar: {
    [key: string]: {
      // "2021-1" - fullYear, fullMonth (wihout +1)
      dayNumber: number;
      status: 'slow' | 'up' | 'down' | 'future' | 'noinfo';
    }[];
  };

  events: {
    timestamp: number;
    type: 'start' | 'healthy' | 'unhealthy';
  }[];
};

export type DataStateComplexStatus = {
  status: string;
  percentageUp: number;
  statusAmount: number;
  responseTime: number;
};

export type DataStateProject = {
  sort: number;

  $id: string;
  name: string;
  url: string;

  groupId: string;

  mainStatuses: AppwritePing[];
  latestStatus: AppwritePing;
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
  isInitLoading: boolean;

  projectDetails: {
    [key: string]: DateStateDetailedProject;
  };
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
    isInitLoading: true,
    projectDetails: {},
  },
})
@Injectable()
export class DataState extends NgxsDataRepository<DataStateModel> {
  @Select()
  static getGroupProjects(
    state: DataStateModel,
    groupId: string
  ): DataStateProject[] {
    const projects: DataStateProject[] = [];

    for (const group of state.groups) {
      if (group.$id === groupId) {
        projects.push(...group.projects);
        return projects;
      }
    }

    return projects;
  }

  @Selector()
  static getProject(
    state: DataStateModel,
    projectId: string
  ): DataStateProject | null {
    for (const group of state.groups) {
      for (const project of group.projects) {
        if (project.$id === projectId) {
          return project;
        }
      }
    }

    return null;
  }

  @Selector()
  static getGroup(
    state: DataStateModel,
    groupId: string
  ): DataStateGroup | null {
    for (const group of state.groups) {
      if (group.$id === groupId) {
        return group;
      }
    }

    return null;
  }

  @Selector()
  static getProjectDetail(
    state: DataStateModel,
    projectId: string
  ): DateStateDetailedProject | null {
    return state.projectDetails[projectId] || null;
  }

  @Selector()
  static getTotalOfStatus(
    state: DataStateModel,
    status?: 'up' | 'down' | 'slow'
  ): string {
    let total = 0;

    if (state.isInitLoading) {
      return '...';
    }

    for (const group of state.groups) {
      const groupStatus = DataState.groupStatus(state, group.$id);

      if (!status || groupStatus.status === status) {
        total += groupStatus.statusAmount;
      }
    }

    return `${total}`;
  }

  @Selector()
  static getOverallStatus(state: DataStateModel): {
    status: 'slow' | 'up' | 'down' | 'loading';
    amount: number;
  } {
    let totalDown = 0;
    let totalUp = 0;
    let totalSlow = 0;

    if (state.isInitLoading) {
      return {
        amount: 0,
        status: 'loading',
      };
    }

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
      responseTime: 0,
    };

    for (const group of state.groups) {
      for (const project of group.projects) {
        if (project.$id === projectId) {
          const upPings = [];
          const downPings = [];
          const slowPings = [];

          let totalPings = 0;
          let upPingsTotal = 0;
          let totalResponseTime = 0;

          for (const ping of project.mainStatuses) {
            totalPings++;
            totalResponseTime += ping.responseTime;

            if (ping.status === 'slow') {
              upPingsTotal++;
              slowPings.push(ping);
            } else if (ping.status === 'down') {
              downPings.push(ping);
            } else if (ping.status === 'up' || ping.status === 'loading') {
              upPingsTotal++;
              upPings.push(ping);
            }
          }

          const percentageUp =
            totalPings === 0 ? 100 : (upPingsTotal / totalPings) * 100;

          resultStatus.percentageUp = percentageUp;
          resultStatus.status = project.latestStatus.status;
          resultStatus.statusAmount = 1;
          resultStatus.responseTime = Math.round(
            totalResponseTime /
              project.mainStatuses.reduce((totalStatuses, currentStatus) => {
                return (
                  totalStatuses + (currentStatus.responseTime === 0 ? 0 : 1)
                );
              }, 0)
          );

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
      responseTime: 0,
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
    let totalResponseTime = 0;
    let totalResponses = 0;

    for (const project of group.projects) {
      const projectStatus = DataState.projectStatus(state, project.$id);

      totalResponseTime += projectStatus.responseTime;
      if (projectStatus.responseTime > 0) {
        totalResponses++;
      }

      totalUpPercentage += projectStatus.percentageUp;
      totalUp++;
      if (projectStatus.status === 'slow') {
        slowProjects.push({
          percentageUp: projectStatus.percentageUp,
          ...project,
        });
      } else if (
        projectStatus.status === 'up' ||
        projectStatus.status === 'loading'
      ) {
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

    resultStatus.responseTime = Math.round(totalResponseTime / totalResponses);
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
        draft.isInitLoading = false;

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
            const missingPings = 60 - project.mainPings.length;
            for (let i = 0; i < missingPings; i++) {
              project.mainPings.unshift({
                status: 'loading',
                responseTime: 0,
                createdAt: new Date().getTime(),
                $id: 'fakeid_' + Date.now(),
                projectId: project.$id,
              });
            }

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
                groupId: group.$id,

                mainStatuses: project.mainPings,

                latestStatus: latestPing,
              });
            } else {
              const latestPing =
                project.mainPings[project.mainPings.length - 1];

              draftProject.mainStatuses = project.mainPings;

              draftProject.latestStatus = latestPing;
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

    this.updateFavicon(DataState.getOverallStatus(this.ctx.getState()).status);
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

  @DataAction() async loadProjectDetail(projectId: string) {
    await new Promise<boolean>((res, rej) => {
      let i = 0;
      const interval = setInterval(() => {
        i++;

        if (!this.ctx.getState().isInitLoading) {
          res(true);
        }

        if (i > 100) {
          rej('Could not load basic project data');
          clearInterval(interval);
        }
      }, 150);
    });

    const thisMonthFirstDay = new Date();
    thisMonthFirstDay.setDate(1);
    thisMonthFirstDay.setHours(0);
    thisMonthFirstDay.setMinutes(0);
    thisMonthFirstDay.setSeconds(0);
    thisMonthFirstDay.setMilliseconds(0);

    const nextMonthFirstDay = new Date(thisMonthFirstDay.getTime());
    nextMonthFirstDay.setMonth(nextMonthFirstDay.getMonth() + 1);

    const calendarDaysResponse: any =
      await this.appwriteService.sdk.database.listDocuments(
        this.appwriteService.ids.dailyPings,
        [
          `projectId=${projectId}`,
          `dayAt>=${thisMonthFirstDay.getTime()}`,
          `dayAt<=${nextMonthFirstDay.getTime()}`,
        ],
        100,
        0
      ); // TODO: Pagination? Should not be required because month only has 30 days

    const calendarDays: AppwriteDailyPing[] = calendarDaysResponse.documents;

    this.ctx.setState(
      produce(this.ctx.getState(), (draft) => {
        if (!draft.projectDetails[projectId]) {
          draft.projectDetails[projectId] = {
            uptime24h: 100,
            uptime7d: 100,
            events: [],
            calendar: {},
          };
        }

        // TODO: uptime24h, uptime7d

        draft.projectDetails[projectId].calendar[
          `${new Date().getFullYear()}_${new Date().getMonth()}`
        ] = calendarDays.map((c) => {
          return {
            status: c.status,
            dayNumber: new Date(c.dayAt).getDate(),
          };
        });
      })
    );
  }

  private updateFavicon(overallStatus: 'up' | 'down' | 'slow' | 'loading') {
    let faviconSrc = '/assets/favicons/unknown_favicon.ico';

    if (overallStatus === 'down') {
      faviconSrc = '/assets/favicons/down_favicon.ico';
    } else if (overallStatus === 'slow') {
      faviconSrc = '/assets/favicons/slow_favicon.ico';
    } else if (overallStatus === 'up') {
      faviconSrc = '/assets/favicons/up_favicon.ico';
    }

    let link: any = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconSrc;
  }

  constructor(private appwriteService: AppwriteService) {
    super();
  }
}
