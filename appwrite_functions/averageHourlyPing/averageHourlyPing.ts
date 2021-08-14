import * as sdk from 'https://deno.land/x/appwrite@0.3.0/mod.ts';

try {
  const client = new sdk.Client();

  client
    .setEndpoint(Deno.env.get('APPWRITE_API_ENDPOINT') || '')
    .setProject(Deno.env.get('APPWRITE_PROJECT_ID') || '')
    .setKey(Deno.env.get('APPWRITE_API_KEY') || '');

  const hourlyPingsCollectionId = Deno.env.get('COLLECTION_ID_HOURLYPINGS');
  const projectsCollectionId = Deno.env.get('COLLECTION_ID_PROJECTS');
  const pingsCollectionId = Deno.env.get('COLLECTION_ID_PINGS');

  if (!hourlyPingsCollectionId || !projectsCollectionId || !pingsCollectionId) {
    throw new Error(`Some variables are missing`);
  }

  const currentDate = new Date();
  currentDate.setMinutes(0);
  currentDate.setSeconds(0);
  currentDate.setMilliseconds(0);

  // 3600000 miliseconds = 1 hour
  const lastHourDate = new Date(currentDate.getTime() - 3600000);

  const database = new sdk.Database(client);

  const { documents: projectsArray } = await database.listDocuments(
    projectsCollectionId,
    [],
    100
  );

  for (const project of projectsArray) {
    const { documents: existingHourlyPingArray } = await database.listDocuments(
      hourlyPingsCollectionId,
      [`projectId=${project.$id}`, `hourAt=${currentDate.getTime()}`],
      1
    );

    if (existingHourlyPingArray.length > 0) {
      console.log(
        'Hourly ping for project ' +
          project.name +
          ', hour ' +
          currentDate.toISOString() +
          ' already exists'
      );
      continue;
    }

    const { sum: totalPings } = await database.listDocuments(
      pingsCollectionId,
      [
        `projectId=${project.$id}`,
        `createdAt>${lastHourDate.getTime()}`,
        `createdAt<${currentDate.getTime()}`,
      ],
      1
    );

    if (totalPings <= 0) {
      console.log(
        '[NO RECORDS YET] Hourly ping for project ' +
          project.name +
          ', hour ' +
          currentDate.toISOString()
      );
      continue;
    }

    const allPings = [];
    for (let offset = 0; offset <= totalPings; offset += 100) {
      const { documents: currentPagePingsArray } = await database.listDocuments(
        pingsCollectionId,
        [
          `projectId=${project.$id}`,
          `createdAt>${lastHourDate.getTime()}`,
          `createdAt<${currentDate.getTime()}`,
        ],
        100,
        offset
      );

      allPings.push(...currentPagePingsArray);
    }

    let totalDown = 0;
    let totalUp = 0;
    let totalSlow = 0;

    let totalResponseTime = 0;
    let totalResponseAverage = 0;

    for (const ping of allPings) {
      if (ping.status === 'slow') {
        totalSlow++;
      } else if (ping.status === 'down') {
        totalDown++;
      } else if (ping.status === 'up') {
        totalUp++;
      }

      totalResponseAverage += ping.responseTime;
      if (ping.responseTime > 0) {
        totalResponseTime++;
      }
    }

    const averageStatus =
      totalDown > 0 ? 'down' : totalSlow > 0 ? 'slow' : 'up';
    const averageResponseTime = totalResponseAverage / totalResponseTime;
    const averageUptime =
      ((totalUp + totalSlow) / (totalUp + totalSlow + totalDown)) * 100;

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
      'Hourly ping for project ' +
        project.name +
        ', hour ' +
        currentDate.toISOString() +
        ' calculated to be ' +
        averageStatus +
        ', ' +
        averageResponseTime +
        'ms, ' +
        averageUptime +
        '%'
    );
  }
} catch (err) {
  console.error(err);
  throw err;
}
