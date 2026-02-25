import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';
import type {
  APIProfile,
  ProfileFormData,
  ProfilesFile,
  TestConnectionResult,
  DiscoverModelsResult
} from '@shared/types/profile';

export interface ProfileAPI {
  // Get all profiles
  getAPIProfiles: () => Promise<IPCResult<ProfilesFile>>;

  // Save/create a profile
  saveAPIProfile: (
    profile: ProfileFormData
  ) => Promise<IPCResult<APIProfile>>;

  // Update an existing profile
  updateAPIProfile: (
    profile: APIProfile
  ) => Promise<IPCResult<APIProfile>>;

  // Delete a profile
  deleteAPIProfile: (profileId: string) => Promise<IPCResult>;

  // Set active profile (null to switch to OAuth)
  setActiveAPIProfile: (profileId: string | null) => Promise<IPCResult>;

  // Test API profile connection
  testConnection: (
    baseUrl: string,
    apiKey: string,
    signal?: AbortSignal
  ) => Promise<IPCResult<TestConnectionResult>>;

  // Discover available models from API
  discoverModels: (
    baseUrl: string,
    apiKey: string,
    signal?: AbortSignal
  ) => Promise<IPCResult<DiscoverModelsResult>>;
}

let testConnectionRequestId = 0;
let discoverModelsRequestId = 0;

export const createProfileAPI = (): ProfileAPI => ({
  // Get all profiles
  getAPIProfiles: (): Promise<IPCResult<ProfilesFile>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILES_GET),

  // Save/create a profile
  saveAPIProfile: (
    profile: ProfileFormData
  ): Promise<IPCResult<APIProfile>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILES_SAVE, profile),

  // Update an existing profile
  updateAPIProfile: (
    profile: APIProfile
  ): Promise<IPCResult<APIProfile>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, profile),

  // Delete a profile
  deleteAPIProfile: (profileId: string): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, profileId),

  // Set active profile (null to switch to OAuth)
  setActiveAPIProfile: (profileId: string | null): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILES_SET_ACTIVE, profileId),

  // Test API profile connection
  testConnection: (
    baseUrl: string,
    apiKey: string,
    _signal?: AbortSignal
  ): Promise<IPCResult<TestConnectionResult>> => {
    const requestId = ++testConnectionRequestId;

    // Note: AbortSignal cannot be passed via IPC (gets serialized and loses methods)
    // Cancellation is handled via PROFILES_TEST_CONNECTION_CANCEL channel
    // The _signal parameter is kept for API compatibility but not used here

    return ipcRenderer.invoke(IPC_CHANNELS.PROFILES_TEST_CONNECTION, baseUrl, apiKey, requestId);
  },

  // Discover available models from API
  discoverModels: (
    baseUrl: string,
    apiKey: string,
    _signal?: AbortSignal
  ): Promise<IPCResult<DiscoverModelsResult>> => {
    const requestId = ++discoverModelsRequestId;

    // Note: AbortSignal cannot be passed via IPC (gets serialized and loses methods)
    // Cancellation is handled via PROFILES_DISCOVER_MODELS_CANCEL channel
    // The _signal parameter is kept for API compatibility but not used here

    return ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DISCOVER_MODELS, baseUrl, apiKey, requestId);
  }
});
