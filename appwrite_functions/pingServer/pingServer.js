require('dotenv').config();

const appwrite = require("node-appwrite");


const client = new appwrite.Client();
const fetch = require("node-fetch");

main()

async function main() {
    client
        .setEndpoint(process.env.APPWRITE_API_ENDPOINT || '')
        .setProject(process.env.APPWRITE_PROJECT_ID || '')
        .setKey(process.env.APPWRITE_API_KEY || '');

    const pingTargetProject = process.env.APPWRITE_FUNCTION_DATA;
    const pingsCollectionId = process.env.COLLECTION_ID_PINGS;
    const projectsCollectionId = process.env.COLLECTION_ID_PROJECTS;
    const slowResponseTimeTresholdStr = process.env.SLOW_RESPONSE_TRESHOLD;

    if (
        !pingTargetProject ||
        !pingsCollectionId ||
        !projectsCollectionId ||
        !slowResponseTimeTresholdStr
    ) {
        throw new Error(`Some variables are missing`);
    }

    const slowResponseTimeTreshold = +slowResponseTimeTresholdStr;
    const database = new appwrite.Database(client);

    let pingStatus;

    const pingStartTime = Date.now();

    const projectDocument = await database.getDocument(
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
}
