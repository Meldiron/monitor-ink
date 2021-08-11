class AppwriteException {
    message;
    code;
    response;
    constructor(message, code = 0, response = ""){
        this.message = message;
        this.code = code;
        this.response = response;
    }
}
class Client {
    endpoint = 'https://appwrite.io/v1';
    headers = {
        'content-type': '',
        'x-sdk-version': 'appwrite:deno:0.3.0',
        'X-Appwrite-Response-Format': '0.9.0'
    };
    setProject(value) {
        this.addHeader('X-Appwrite-Project', value);
        return this;
    }
    setKey(value) {
        this.addHeader('X-Appwrite-Key', value);
        return this;
    }
    setJWT(value) {
        this.addHeader('X-Appwrite-JWT', value);
        return this;
    }
    setLocale(value) {
        this.addHeader('X-Appwrite-Locale', value);
        return this;
    }
    setEndpoint(endpoint) {
        this.endpoint = endpoint;
        return this;
    }
    addHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
        return this;
    }
    withoutHeader(key, headers) {
        return Object.keys(headers).reduce((acc, cv)=>{
            if (cv == 'content-type') return acc;
            acc[cv] = headers[cv];
            return acc;
        }, {
        });
    }
    async call(method, path = '', headers = {
    }, params = {
    }) {
        headers = {
            ...this.headers,
            ...headers
        };
        let body;
        const url = new URL(this.endpoint + path);
        if (method.toUpperCase() === 'GET') {
            url.search = new URLSearchParams(this.flatten(params)).toString();
            body = null;
        } else if (headers['content-type'].toLowerCase().startsWith('multipart/form-data')) {
            headers = this.withoutHeader('content-type', headers);
            const formData = new FormData();
            const flatParams = this.flatten(params);
            for(const key in flatParams){
                formData.append(key, flatParams[key]);
            }
            body = formData;
        } else {
            body = JSON.stringify(params);
        }
        const options = {
            method: method.toUpperCase(),
            headers: headers,
            body: body
        };
        try {
            let response1 = await fetch(url.toString(), options);
            const contentType = response1.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                if (response1.status >= 400) {
                    let res = await response1.json();
                    throw new AppwriteException(res.message, res.status, res);
                }
                return response1.json();
            } else {
                if (response1.status >= 400) {
                    let res = await response1.text();
                    throw new AppwriteException(res, response1.status, null);
                }
                return response1;
            }
        } catch (error) {
            throw new AppwriteException(error?.response?.message || error.message, error?.response?.code, error.response);
        }
    }
    flatten(data, prefix = '') {
        let output = {
        };
        for(const key in data){
            let value = data[key];
            let finalKey = prefix ? prefix + '[' + key + ']' : key;
            if (Array.isArray(value)) {
                output = {
                    ...output,
                    ...this.flatten(value, finalKey)
                };
            } else {
                output[finalKey] = value;
            }
        }
        return output;
    }
}
class Service {
    client;
    constructor(client){
        this.client = client;
    }
}
class Database extends Service {
    async listCollections(search, limit, offset, orderType) {
        let path = '/database/collections';
        let payload = {
        };
        if (typeof search !== 'undefined') {
            payload['search'] = search;
        }
        if (typeof limit !== 'undefined') {
            payload['limit'] = limit;
        }
        if (typeof offset !== 'undefined') {
            payload['offset'] = offset;
        }
        if (typeof orderType !== 'undefined') {
            payload['orderType'] = orderType;
        }
        return await this.client.call('get', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async createCollection(name, read, write, rules) {
        if (typeof name === 'undefined') {
            throw new AppwriteException('Missing required parameter: "name"');
        }
        if (typeof read === 'undefined') {
            throw new AppwriteException('Missing required parameter: "read"');
        }
        if (typeof write === 'undefined') {
            throw new AppwriteException('Missing required parameter: "write"');
        }
        if (typeof rules === 'undefined') {
            throw new AppwriteException('Missing required parameter: "rules"');
        }
        let path = '/database/collections';
        let payload = {
        };
        if (typeof name !== 'undefined') {
            payload['name'] = name;
        }
        if (typeof read !== 'undefined') {
            payload['read'] = read;
        }
        if (typeof write !== 'undefined') {
            payload['write'] = write;
        }
        if (typeof rules !== 'undefined') {
            payload['rules'] = rules;
        }
        return await this.client.call('post', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async getCollection(collectionId) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        let path = '/database/collections/{collectionId}'.replace('{collectionId}', collectionId);
        let payload = {
        };
        return await this.client.call('get', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async updateCollection(collectionId, name, read, write, rules) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        if (typeof name === 'undefined') {
            throw new AppwriteException('Missing required parameter: "name"');
        }
        let path = '/database/collections/{collectionId}'.replace('{collectionId}', collectionId);
        let payload = {
        };
        if (typeof name !== 'undefined') {
            payload['name'] = name;
        }
        if (typeof read !== 'undefined') {
            payload['read'] = read;
        }
        if (typeof write !== 'undefined') {
            payload['write'] = write;
        }
        if (typeof rules !== 'undefined') {
            payload['rules'] = rules;
        }
        return await this.client.call('put', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async deleteCollection(collectionId) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        let path = '/database/collections/{collectionId}'.replace('{collectionId}', collectionId);
        let payload = {
        };
        return await this.client.call('delete', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async listDocuments(collectionId, filters, limit, offset, orderField, orderType, orderCast, search) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        let path = '/database/collections/{collectionId}/documents'.replace('{collectionId}', collectionId);
        let payload = {
        };
        if (typeof filters !== 'undefined') {
            payload['filters'] = filters;
        }
        if (typeof limit !== 'undefined') {
            payload['limit'] = limit;
        }
        if (typeof offset !== 'undefined') {
            payload['offset'] = offset;
        }
        if (typeof orderField !== 'undefined') {
            payload['orderField'] = orderField;
        }
        if (typeof orderType !== 'undefined') {
            payload['orderType'] = orderType;
        }
        if (typeof orderCast !== 'undefined') {
            payload['orderCast'] = orderCast;
        }
        if (typeof search !== 'undefined') {
            payload['search'] = search;
        }
        return await this.client.call('get', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async createDocument(collectionId, data, read, write, parentDocument, parentProperty, parentPropertyType) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        if (typeof data === 'undefined') {
            throw new AppwriteException('Missing required parameter: "data"');
        }
        let path = '/database/collections/{collectionId}/documents'.replace('{collectionId}', collectionId);
        let payload = {
        };
        if (typeof data !== 'undefined') {
            payload['data'] = data;
        }
        if (typeof read !== 'undefined') {
            payload['read'] = read;
        }
        if (typeof write !== 'undefined') {
            payload['write'] = write;
        }
        if (typeof parentDocument !== 'undefined') {
            payload['parentDocument'] = parentDocument;
        }
        if (typeof parentProperty !== 'undefined') {
            payload['parentProperty'] = parentProperty;
        }
        if (typeof parentPropertyType !== 'undefined') {
            payload['parentPropertyType'] = parentPropertyType;
        }
        return await this.client.call('post', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async getDocument(collectionId, documentId) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        if (typeof documentId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "documentId"');
        }
        let path = '/database/collections/{collectionId}/documents/{documentId}'.replace('{collectionId}', collectionId).replace('{documentId}', documentId);
        let payload = {
        };
        return await this.client.call('get', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async updateDocument(collectionId, documentId, data, read, write) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        if (typeof documentId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "documentId"');
        }
        if (typeof data === 'undefined') {
            throw new AppwriteException('Missing required parameter: "data"');
        }
        let path = '/database/collections/{collectionId}/documents/{documentId}'.replace('{collectionId}', collectionId).replace('{documentId}', documentId);
        let payload = {
        };
        if (typeof data !== 'undefined') {
            payload['data'] = data;
        }
        if (typeof read !== 'undefined') {
            payload['read'] = read;
        }
        if (typeof write !== 'undefined') {
            payload['write'] = write;
        }
        return await this.client.call('patch', path, {
            'content-type': 'application/json'
        }, payload);
    }
    async deleteDocument(collectionId, documentId) {
        if (typeof collectionId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "collectionId"');
        }
        if (typeof documentId === 'undefined') {
            throw new AppwriteException('Missing required parameter: "documentId"');
        }
        let path = '/database/collections/{collectionId}/documents/{documentId}'.replace('{collectionId}', collectionId).replace('{documentId}', documentId);
        let payload = {
        };
        return await this.client.call('delete', path, {
            'content-type': 'application/json'
        }, payload);
    }
}
try {
    const client1 = new Client();
    client1.setEndpoint(Deno.env.get('APPWRITE_API_ENDPOINT') || '').setProject(Deno.env.get('APPWRITE_PROJECT_ID') || '').setKey(Deno.env.get('APPWRITE_API_KEY') || '');
    const pingTargetProject = Deno.env.get('APPWRITE_FUNCTION_DATA');
    const pingsCollectionId = Deno.env.get('PINGS_COLLECTION_ID');
    const projectsCollectionId = Deno.env.get('PROLECTS_COLLECTION_ID');
    const slowResponseTimeTresholdStr = Deno.env.get('SLOW_RESPONSE_TRESHOLD');
    if (!pingTargetProject || !pingsCollectionId || !projectsCollectionId || !slowResponseTimeTresholdStr) {
        Deno.exit();
    }
    const slowResponseTimeTreshold = +slowResponseTimeTresholdStr;
    const database = new Database(client1);
    let pingStatus;
    const pingStartTime = Date.now();
    const projectDocument = await database.getDocument(projectsCollectionId, pingTargetProject);
    try {
        const _websiteRes = await fetch(projectDocument.url);
        pingStatus = 'up';
    } catch (_err) {
        pingStatus = 'down';
    }
    const pingEndTime = Date.now();
    const pingDifference = pingEndTime - pingStartTime;
    const finalStatus = pingDifference > slowResponseTimeTreshold ? 'slow' : pingStatus;
    await database.createDocument(pingsCollectionId, {
        createdAt: new Date(pingStartTime).toISOString(),
        projectId: pingTargetProject,
        responseTime: pingDifference,
        status: finalStatus
    }, [
        '*'
    ], []);
    console.log(`Page is ${finalStatus} in ${pingDifference}ms at ${projectDocument.url}`);
} catch (err) {
    console.error(err);
    Deno.exit();
}
