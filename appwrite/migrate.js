require("dotenv").config();

const sdk = require("node-appwrite");
const fs = require("fs");
const path = require("path");

let client = new sdk.Client();

client
  .setEndpoint(process.env.APPWRITE_API_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Database(client);
const functions = new sdk.Functions(client);

const websitesJson = JSON.parse(fs.readFileSync("websites.json").toString());
const collectionIdMap = {}; // { "users": "s498baa1ds23" }
const functionIdMap = {}; // { "pingServer": "7489sds4f89d" }

const migrateDatabase = async () => {
  const collectionsJson = JSON.parse(
    fs.readFileSync("setup/collections.json").toString()
  );

  for (const collection of collectionsJson.collections) {
    const existingAppwriteCollectionId = await (async () => {
      try {
        const appwriteCollection = await database.listCollections(
          collection.name,
          1
        );

        return appwriteCollection.collections[0].$id;
      } catch (err) {
        // Collection not found
        return null;
      }
    })();

    if (existingAppwriteCollectionId) {
      console.warn(`⚠️ Collection ${collection.name} already exists`);

      collectionIdMap[collection.name] = existingAppwriteCollectionId;
    } else {
      console.info(`🍏 Creating collection ${collection.name} ...`);

      const { $id: collectionId } = await database.createCollection(
        collection.name,
        collection.$permissions.read,
        collection.$permissions.write,
        collection.rules
      );

      collectionIdMap[collection.name] = collectionId;
    }
  }

  fs.writeFileSync(
    "../src/assets/collections.json",
    JSON.stringify(collectionIdMap, null, 4)
  );
};

const migrateFunctions = async () => {
  const functionsJson = JSON.parse(
    fs.readFileSync("setup/functions.json").toString()
  );

  for (const functionObj of functionsJson.functions) {
    const existingAppwriteFunctionId = await (async () => {
      try {
        const appwriteFunction = await functions.list(functionObj.name, 1);

        return appwriteFunction.functions[0].$id;
      } catch (err) {
        // Function not found
        return null;
      }
    })();

    if (existingAppwriteFunctionId) {
      console.warn(`⚠️ Function ${functionObj.name} already exists`);
      functionIdMap[functionObj.name] = existingAppwriteFunctionId;
    } else {
      console.info(`🍏 Creating function ${functionObj.name} ...`);

      const { $id: functionId } = await functions.create(
        functionObj.name,
        functionObj.$permissions.execute,
        functionObj.runtime,
        {
          ...functionObj.vars,
          APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
          APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
          APPWRITE_API_ENDPOINT: process.env.APPWRITE_API_ENDPOINT,
          PINGS_COLLECTION_ID: collectionIdMap.pings,
          PROLECTS_COLLECTION_ID: collectionIdMap.projects,
          SLOW_RESPONSE_TRESHOLD: websitesJson.tresholdForSlowPing,
        },
        functionObj.events,
        functionObj.schedule,
        functionObj.timeout
      );

      functionIdMap[functionObj.name] = functionId;
    }
  }
};

const migrateFunctionTags = async () => {
  const tagFilePaths = fs
    .readdirSync("setup/tags")
    .filter((fileName) => fileName.endsWith(".tar.gz"));

  for (const tagFilePath of tagFilePaths) {
    const functionName = tagFilePath.substring(0, tagFilePath.length - 7);
    const functionId = functionIdMap[functionName];

    console.log(`🌀 Deploying function ${functionName}`);

    const tagFile = fs.createReadStream(`setup/tags/${tagFilePath}`);
    const appwriteTag = await await functions.createTag(
      functionId,
      `deno run --allow-env --allow-net ${functionName}.js`,
      tagFile
    );

    await functions.updateTag(functionId, appwriteTag.$id);
  }
};

const insertDocuments = async () => {
  for (const websiteGroup of websitesJson.groups) {
    // Prepare group
    let existingAppwriteGroupId = await (async () => {
      try {
        const appwriteGroupDocument = await database.listDocuments(
          collectionIdMap.groups,
          [`name=${websiteGroup.name}`],
          1
        );

        return appwriteGroupDocument.documents[0].$id;
      } catch (err) {
        // Function not found
        return null;
      }
    })();

    if (!existingAppwriteGroupId) {
      console.log(`🍏 Creating group ${websiteGroup.name} ...`);

      const newAppwriteGroupData = await database.createDocument(
        collectionIdMap.groups,
        {
          name: websiteGroup.name,
          sort: websiteGroup.sort,
        },
        ["*"],
        []
      );

      existingAppwriteGroupId = newAppwriteGroupData.$id;

      for (const websiteProject of websiteGroup.projects) {
        // Prepare project
        const existingAppwriteProjectId = await (async () => {
          try {
            const appwriteGroupDocument = await database.listDocuments(
              collectionIdMap.projects,
              [
                `name=${websiteProject.name}`,
                `groupId=${existingAppwriteGroupId}`,
              ],
              1
            );

            return appwriteGroupDocument.documents[0].$id;
          } catch (err) {
            // Function not found
            return null;
          }
        })();

        if (!existingAppwriteProjectId) {
          console.log(`🍏 Creating project ${websiteProject.name} ...`);

          await database.createDocument(
            collectionIdMap.projects,
            {
              name: websiteProject.name,
              url: websiteProject.url,
              sort: websiteProject.sort,
              groupId: existingAppwriteGroupId,
            },
            ["*"],
            []
          );
        } else {
          console.log(`⚠️ Project ${websiteProject.name} already exists`);
        }
      }
    } else {
      console.log(`⚠️ Group ${websiteGroup.name} already exists`);
    }
  }
};

// For development purposes
const wipeAppwriteProject = async () => {
  const collectionsData = await database.listCollections(undefined, 100, 0);
  for (const collection of collectionsData.collections) {
    await database.deleteCollection(collection.$id);
  }

  const functionsData = await functions.list(undefined, 100, 0);
  for (const functionObj of functionsData.functions) {
    await functions.delete(functionObj.$id);
  }
};

(async () => {
  // await wipeAppwriteProject();

  console.log("==== Database migration ====");
  await migrateDatabase();
  console.log("==== Functions migration ====");
  await migrateFunctions();
  console.log("==== Function tags migration ====");
  await migrateFunctionTags();
  console.log("==== Documents migration ====");
  await insertDocuments();
})()
  .then(() => {
    console.log("Migration finished ✅");
    process.exit();
  })
  .catch((err) => {
    console.error("Migration failed ❌");
    console.error(err);
    process.exit();
  });
