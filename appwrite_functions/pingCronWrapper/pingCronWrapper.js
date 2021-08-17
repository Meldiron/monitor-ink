require('dotenv').config();

const appwrite = require("node-appwrite");

const client = new appwrite.Client();

main()

async function main() {

  client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const pingFunctionId = process.env.FUNCTION_ID_PINGSERVER;
  const projectsCollectionId = process.env.COLLECTION_ID_PROJECTS;

  if (!pingFunctionId || !projectsCollectionId) {
    throw new Error(`Some variables are missing`);
  }

  const database = new appwrite.Database(client);
  const functions = new appwrite.Functions(client);

  const runningExecutions = await functions.listExecutions(
    pingFunctionId,
    undefined,
    1,
    0,
    'DESC'
  );

  const firstRunningExecution = runningExecutions.executions[0];

  if (firstRunningExecution && firstRunningExecution.status === 'waiting') {
    throw new Error(`There are tests still running. You need to scale!`);
  }

  const getAllProjectRecursive = async (documentsArray = [], offset = 0) => {
    const documentsChunk = await database.listDocuments(
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
}
