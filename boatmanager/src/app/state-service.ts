import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AppState } from './app-state';

/**
 * StateService is responsible for managing the application state.
 * It uses BehaviorSubject to hold the current state and allows components to subscribe to state changes.
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {
  
  private appState = new AppState
  private stateSource = new BehaviorSubject<AppState>(this.appState);
  currentState = this.stateSource.asObservable();

  updateState(state: AppState) {
    this.stateSource.next(state);
  }

  resetState() {
    this.appState.reset();
    this.stateSource.next(this.appState );
  }
}
