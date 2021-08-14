import * as sdk from 'https://deno.land/x/appwrite@0.3.0/mod.ts';

try {
  const client = new sdk.Client();

  client
    .setEndpoint(Deno.env.get('APPWRITE_API_ENDPOINT') || '')
    .setProject(Deno.env.get('APPWRITE_PROJECT_ID') || '')
    .setKey(Deno.env.get('APPWRITE_API_KEY') || '');

  const pingTargetProject = Deno.env.get('APPWRITE_FUNCTION_DATA');
  const pingsCollectionId = Deno.env.get('COLLECTION_ID_PINGS');
  const projectsCollectionId = Deno.env.get('COLLECTION_ID_PROJECTS');
  const slowResponseTimeTresholdStr = Deno.env.get('SLOW_RESPONSE_TRESHOLD');

  if (
    !pingTargetProject ||
    !pingsCollectionId ||
    !projectsCollectionId ||
    !slowResponseTimeTresholdStr
  ) {
    throw new Error(`Some variables are missing`);
  }

  const slowResponseTimeTreshold = +slowResponseTimeTresholdStr;
  const database = new sdk.Database(client);

  let pingStatus: string;

  const pingStartTime = Date.now();

  const projectDocument: any = await database.getDocument(
    projectsCollectionId,
    pingTargetProject
  );

  try {
    const _websiteRes = await new Promise(async (promiseRes, promiseRej) => {
      const timeout = setTimeout(() => {
        promiseRej('Timed out over 10 seconds');
      }, 10000);

      await fetch(projectDocument.url);
      clearTimeout(timeout);

      promiseRes(true);
    });

    pingStatus = 'up';
  } catch (_err) {
    // Cannot fetch website

    pingStatus = 'down';
  }

  const pingEndTime = Date.now();

  const pingDifference = pingEndTime - pingStartTime;

  const finalStatus =
    pingStatus === 'down'
      ? pingStatus
      : pingDifference > slowResponseTimeTreshold
      ? 'slow'
      : pingStatus;

  await database.createDocument(
    pingsCollectionId,
    {
      createdAt: pingStartTime,
      projectId: pingTargetProject,
      responseTime: pingDifference,
      status: finalStatus,
    },
    ['*'],
    []
  );

  console.log(
    `Page is ${finalStatus} in ${pingDifference}ms at ${projectDocument.url}`
  );
} catch (err) {
  console.error(err);
  throw err;
}
