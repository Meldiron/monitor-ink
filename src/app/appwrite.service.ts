import { Injectable } from '@angular/core';
import { Appwrite } from 'appwrite';
import { environment } from 'src/environments/environment';

import collections from '../assets/collections.json';

export type AppwriteBaseDocument = {
  $id: string;
};

export type AppwriteSetting = AppwriteBaseDocument & {
  contactEmail: string;
  contactPhone: string;
  brandingTitle: string;
  brandingDescription: string;
  brandingLogoSrc: string;
};

export type AppwritePing = AppwriteBaseDocument & {
  status: 'up' | 'down' | 'slow' | 'loading';
  responseTime: number;
  createdAt: number;
  projectId: string;
};

export type AppwriteProject = AppwriteBaseDocument & {
  name: string;
  sort: number;
  url: string;
  groupId: string;
};

export type AppwriteGroup = AppwriteBaseDocument & {
  name: string;
  sort: number;
};

@Injectable({
  providedIn: 'root',
})
export class AppwriteService {
  public sdk: Appwrite;
  public ids: {
    [key: string]: string;
  } = {};

  constructor() {
    this.ids = { ...collections };

    this.sdk = new Appwrite();

    this.sdk
      .setEndpoint(environment.appwriteEndpoint)
      .setProject(environment.appwriteProjectId);
  }
}
