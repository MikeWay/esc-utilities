import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { Boat } from '../../model/Boat';
import { Person } from '../../model/Person';
import { AuthenticationException, ServerService } from '../server.service';
import { StateService } from '../state-service';
import { AppState } from '../app-state';
import { CheckInCompleteComponent } from './check-in-complete.component';

describe('CheckInCompleteComponent', () => {
  let component: CheckInCompleteComponent;
  let fixture: ComponentFixture<CheckInCompleteComponent>;
  let serverSpy: jasmine.SpyObj<ServerService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let stateSubject: BehaviorSubject<AppState>;

  const buildState = (): AppState => {
    const state = new AppState();
    state.enableNextButton = true;
    state.engineHours = 2;
    state.returnedKey = true;
    state.refueledBoat = false;
    const user = new Person('1', 'Test', 'User', 1, 1);
    state.currentBoat = new Boat('boat-1', 'Test Boat', false, user);
    state.defects = [];
    return state;
  };

  beforeEach(async () => {
    serverSpy = jasmine.createSpyObj('ServerService', ['checkInBoat']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    stateSubject = new BehaviorSubject<AppState>(buildState());

    await TestBed.configureTestingModule({
      imports: [CheckInCompleteComponent],
      providers: [
        { provide: ServerService, useValue: serverSpy },
        { provide: Router, useValue: routerSpy },
        { provide: StateService, useValue: { currentState: stateSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckInCompleteComponent);
    component = fixture.componentInstance;
  });

  it('disables the next button and performs check-in on init', async () => {
    const state = stateSubject.value;
    serverSpy.checkInBoat.and.returnValue(Promise.resolve(true));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.currentState?.enableNextButton).toBeFalse();
    expect(serverSpy.checkInBoat).toHaveBeenCalledOnceWith(
      state.currentBoat!,
      state.currentBoat!.checkedOutTo!,
      state.defects,
      state.engineHours,
      state.returnedKey,
      state.refueledBoat
    );
  });

  it('navigates to login when authentication fails', async () => {
    serverSpy.checkInBoat.and.returnValue(Promise.reject(new AuthenticationException('unauthorized')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
