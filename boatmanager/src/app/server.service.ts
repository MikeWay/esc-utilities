import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Person } from '../model/Person';
import { Boat } from '../model/Boat';
import { Defect, DefectType } from '../model/defect';

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  private http = inject(HttpClient);
  private baseUrl = './api'; // Adjust the base URL as needed


  // Add the checkPerson method
  async checkPerson(familyInitial: string, month: string, day: Number, year: Number): Promise<Person[] | null> {

    if (familyInitial.trim() !== '' && month.trim() !== '' && day != 0) {
      return await firstValueFrom(this.http.post<Person[]>(`${this.baseUrl}/check-person`, {
        familyInitial,
        month,
        day,
        year
      }))
        .catch((error) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            throw new AuthenticationException('Unauthorized access. Please log in.');
          }
          console.error('Error checking person:', error);
          return null; // Return null if there's an error
        });
    }
    return Promise.resolve(null);
  }

  async checkoutBoat(boat: Boat, user: Person, reason: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.post<boolean>(`${this.baseUrl}/check-out-boat`, { boat, user, reason }));
      return response;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error checking out boat:', error);
      return false;
    }
  }

  async checkInBoat(boat: Boat, user: Person, problems: Defect[],
    engineHours: number, returnedKey: any, refueledBoat: any
  ): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.post<boolean>(`${this.baseUrl}/check-in-boat`, { boat, user, problems, engineHours, returnedKey, refueledBoat }));
      return response;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error checking in boat:', error);
      return false;
    }
  } 

  async getAvailableBoats(): Promise<Boat[]> {
    try {
      return await firstValueFrom(this.http.get<Boat[]>(`${this.baseUrl}/available-boats`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error fetching available boats:', error);
      return [];
    }
  }

  async getCheckedOutBoats(): Promise<Boat[]> {
    try {
      return await firstValueFrom(this.http.get<Boat[]>(`${this.baseUrl}/checked-out-boats`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error fetching checked out boats:', error);
      return [];
    }
  }
  async getPossibleDefectsList(): Promise<DefectType[]> {
    try {
      return await firstValueFrom(this.http.get<DefectType[]>(`${this.baseUrl}/defects-list`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error fetching defects list:', error);
      return [];
    }
  }

  async getServerVersion(): Promise<string> {
    try {
      const result = await firstValueFrom(this.http.get<{ version: string }>(`${this.baseUrl}/version`));
      return result.version;
    } catch (error) {
      console.error('Error fetching server version:', error);
      return '';
    }
  }

  async getCheckinReasons(): Promise<string[]> {
    try {
      return await firstValueFrom(this.http.get<string[]>(`${this.baseUrl}/checkin-reasons`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        throw new AuthenticationException('Unauthorized access. Please log in.');
      }
      console.error('Error fetching checkin reasons:', error);
      return ['Boat not checked in correctly', 'Other'];
    }
  }

}

export class AuthenticationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationException';
  }
}
