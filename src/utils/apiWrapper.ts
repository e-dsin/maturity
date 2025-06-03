// src/utils/apiWrapper.ts

/**
 * Wrapper pour les appels API avec gestion de mode développement
 * Cette fonction permet d'utiliser des données simulées (mocks) pendant le développement
 * et de basculer facilement vers des appels API réels en production
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Configuration globale
const USE_MOCK_DATA = true; // Mettre à false pour utiliser l'API réelle

interface MockConfig<T> {
  mockData: T;
  delay?: number; // Délai en ms pour simuler une latence réseau
}

/**
 * Wrapper pour les appels API GET
 * @param url URL de l'API
 * @param mockConfig Configuration pour les données simulées
 * @param axiosConfig Configuration Axios optionnelle
 */
export async function apiGet<T>(
  url: string, 
  mockConfig: MockConfig<T>, 
  axiosConfig?: AxiosRequestConfig
): Promise<T> {
  // En mode développement avec mocks activés
  if (USE_MOCK_DATA) {
    console.log(`[API MOCK] GET ${url}`);
    
    // Simuler une latence réseau
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockConfig.mockData);
      }, mockConfig.delay || 500);
    });
  }
  
  // En mode production ou développement avec API réelle
  try {
    const response: AxiosResponse<T> = await axios.get(url, axiosConfig);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'appel à ${url}:`, error);
    
    // En cas d'erreur, on peut choisir de retourner les données mock ou de propager l'erreur
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Utilisation des données mock suite à une erreur d'API`);
      return mockConfig.mockData;
    }
    
    throw error;
  }
}

/**
 * Wrapper pour les appels API POST
 */
export async function apiPost<T, D>(
  url: string,
  data: D,
  mockConfig: MockConfig<T>,
  axiosConfig?: AxiosRequestConfig
): Promise<T> {
  if (USE_MOCK_DATA) {
    console.log(`[API MOCK] POST ${url}`, data);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockConfig.mockData);
      }, mockConfig.delay || 500);
    });
  }
  
  try {
    const response: AxiosResponse<T> = await axios.post(url, data, axiosConfig);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'appel à ${url}:`, error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Utilisation des données mock suite à une erreur d'API`);
      return mockConfig.mockData;
    }
    
    throw error;
  }
}

/**
 * Wrapper pour les appels API PUT
 */
export async function apiPut<T, D>(
  url: string,
  data: D,
  mockConfig: MockConfig<T>,
  axiosConfig?: AxiosRequestConfig
): Promise<T> {
  if (USE_MOCK_DATA) {
    console.log(`[API MOCK] PUT ${url}`, data);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockConfig.mockData);
      }, mockConfig.delay || 500);
    });
  }
  
  try {
    const response: AxiosResponse<T> = await axios.put(url, data, axiosConfig);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'appel à ${url}:`, error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Utilisation des données mock suite à une erreur d'API`);
      return mockConfig.mockData;
    }
    
    throw error;
  }
}

/**
 * Wrapper pour les appels API DELETE
 */
export async function apiDelete<T>(
  url: string,
  mockConfig: MockConfig<T>,
  axiosConfig?: AxiosRequestConfig
): Promise<T> {
  if (USE_MOCK_DATA) {
    console.log(`[API MOCK] DELETE ${url}`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockConfig.mockData);
      }, mockConfig.delay || 500);
    });
  }
  
  try {
    const response: AxiosResponse<T> = await axios.delete(url, axiosConfig);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'appel à ${url}:`, error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Utilisation des données mock suite à une erreur d'API`);
      return mockConfig.mockData;
    }
    
    throw error;
  }
}