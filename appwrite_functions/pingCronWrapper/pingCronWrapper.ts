import * as sdk from 'https://deno.land/x/appwrite@0.3.0/mod.ts';

try {
  const client = new sdk.Client();

  client
    .setEndpoint(Deno.env.get('APPWRITE_API_ENDPOINT') || '')
    .setProject(Deno.env.get('APPWRITE_PROJECT_ID') || '')
    .setKey(Deno.env.get('APPWRITE_API_KEY') || '');

  const pingFunctionId = Deno.env.get('FUNCTION_ID_PINGSERVER');
  const projectsCollectionId = Deno.env.get('COLLECTION_ID_PROJECTS');

  if (!pingFunctionId || !projectsCollectionId) {
    throw new Error(`Some variables are missing`);
  }

  // if (

  // ) {
  //   console.log(
  //     `Some variables are missing: ${pingTargetProject}, ${pingsCollectionId}, ${projectsCollectionId}, ${slowResponseTimeTresholdStr}`
  //   );
  //   Deno.exit();
  // }

  const database = new sdk.Database(client);
  const functions = new sdk.Functions(client);

  const runningExecutions: any = await functions.listExecutions(
    pingFunctionId,
    undefined,
    1
  );
  const firstRunningExecution = runningExecutions.executions[0];

  if (firstRunningExecution && firstRunningExecution.status === 'waiting') {
    throw new Error(`There are tests still running. You need to scale!`);
  }

  const getAllProjectRecursive = async (
    documentsArray: any[] = [],
    offset = 0
  ): Promise<any> => {
    const documentsChunk: any = await database.listDocuments(
      projectsCollectionId,
      undefined,
      100,
      offset
    );

    if (documentsChunk.documents.length > 0) {
      documentsArray.push(...documentsChunk.documents);
      return await getAllProjectRecursive(documentsArray, offset + 100);
    } else {
      return documentsArray;
    }
  };

  const allProjects = await getAllProjectRecursive();

  for (const project of allProjects) {
    const { $id: projectId } = project;

    await functions.createExecution(pingFunctionId, projectId);
  }

  console.log(`Scheduled ${allProjects.length} pings`);
} catch (err) {
  console.error(err);
  throw err;
}
