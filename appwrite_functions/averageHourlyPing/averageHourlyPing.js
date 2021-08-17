require('dotenv').config();

const appwrite = require("node-appwrite");

const {calculateAverageStats} = require("./Utils");

const client = new appwrite.Client();

main()

async function main() {

  client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const hourlyPingsCollectionId = process.env.COLLECTION_ID_HOURLYPINGS;
  const dailyPingsCollectionId = process.env.COLLECTION_ID_DAILYPINGS;
  const projectsCollectionId = process.env.COLLECTION_ID_PROJECTS;
  const pingsCollectionId = process.env.COLLECTION_ID_PINGS;

  if (
    !hourlyPingsCollectionId ||
    !projectsCollectionId ||
    !pingsCollectionId ||
    !dailyPingsCollectionId
  ) {
    throw new Error(`Some variables are missing`);
  }

  const currentDate = new Date();
  currentDate.setMinutes(0);
  currentDate.setSeconds(0);
  currentDate.setMilliseconds(1);

// 3600000 miliseconds = 1 hour
  const lastHourDate = new Date(currentDate.getTime() - 3600000);

  const database = new appwrite.Database(client);

  const {documents: projectsArray} = await database.listDocuments(
    projectsCollectionId,
    [],
    100
  );

  for (const project of projectsArray) {
    const {documents: existingHourlyPingArray} = await database.listDocuments(
      hourlyPingsCollectionId,
      [`projectId=${project.$id}`, `hourAt=${currentDate.getTime()}`],
      1
    );

    if (existingHourlyPingArray.length > 0) {
      console.log(
        project.name + ': Average exists ' + currentDate.toISOString()
      );
      continue;
    }

    const {sum: totalPings} = await database.listDocuments(
      pingsCollectionId,
      [
        `projectId=${project.$id}`,
        `createdAt>=${lastHourDate.getTime()}`,
        `createdAt<=${currentDate.getTime()}`,
      ],
      1
    );

    if (totalPings <= 0) {
      console.log(
        project.name + ': No records yet ' + currentDate.toISOString()
      );
      continue;
    }

    const allPings = [];
    for (let offset = 0; offset <= totalPings; offset += 100) {
      const {documents: currentPagePingsArray} = await database.listDocuments(
        pingsCollectionId,
        [
          `projectId=${project.$id}`,
          `createdAt>=${lastHourDate.getTime()}`,
          `createdAt<=${currentDate.getTime()}`,
        ],
        100,
        offset
      );

      allPings.push(...currentPagePingsArray);
    }

    const {averageResponseTime, averageStatus, averageUptime} =
      calculateAverageStats(allPings);

    await database.createDocument(
      hourlyPingsCollectionId,
      {
        projectId: project.$id,
        responseTime: averageResponseTime,
        status: averageStatus,
        uptime: averageUptime,
        hourAt: currentDate.getTime(),
      },
      ['*'],
      []
    );

    console.log(
      project.name + ': Average calculated ' + currentDate.toISOString()
    );
  }

  console.log('---');

  console.log('Running current&last day average ...');

  for (const project of projectsArray) {
    const currentDay = new Date();
    currentDay.setHours(0);
    currentDay.setMinutes(0);
    currentDay.setSeconds(0);
    currentDay.setMilliseconds(1);

    // 86400000 seconds = 24 hours
    const lastDay = new Date(currentDate.getTime() - 86400000);

    const updateDay = async (dayDate) => {
      // 86400000 seconds = 24 hours
      const nextDayDate = new Date(dayDate.getTime() + 86400000);

      const {documents: hourlyPings} = await database.listDocuments(
        hourlyPingsCollectionId,
        [
          `projectId=${project.$id}`,
          `hourAt>=${dayDate.getTime()}`,
          `hourAt<=${nextDayDate.getTime()}`,
        ],
        100
      ); // TODO: Pagination? Probably not required..

      const {averageResponseTime, averageStatus, averageUptime} =
        calculateAverageStats(hourlyPings);

      const {documents: dailyPingArray} = await database.listDocuments(
        dailyPingsCollectionId,
        [`dayAt=${dayDate.getTime()}`, `projectId=${project.$id}`],
        1
      );

      if (dailyPingArray.length > 0) {
        console.log(
          project.name + ': Updating daily average ' + dayDate.toISOString()
        );

        await database.updateDocument(
          dailyPingsCollectionId,
          dailyPingArray[0].$id,
          {
            projectId: project.$id,
            responseTime: averageResponseTime,
            uptime: averageUptime,
            status: averageStatus,
            dayAt: dayDate.getTime(),
          },
          ['*'],
          []
        );
      } else {
        console.log(
          project.name + ': Creating daily average ' + dayDate.toISOString()
        );

        await database.createDocument(
          dailyPingsCollectionId,
          {
            projectId: project.$id,
            responseTime: averageResponseTime,
            uptime: averageUptime,
            status: averageStatus,
            dayAt: dayDate.getTime(),
          },
          ['*'],
          []
        );
      }
    };

    await Promise.all([updateDay(currentDay), updateDay(lastDay)]);
  }
}
