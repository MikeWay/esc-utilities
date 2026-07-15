import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { Boat } from '../../model/Boat';
import { Person } from '../../model/Person';
import { AuthenticationException, ServerService } from '../server.service';
import { AppState } from '../app-state';
import { StateService } from '../state-service';
import { CheckOutCompleteComponent } from './check-out-complete.component';

describe('CheckOutCompleteComponent', () => {
  let component: CheckOutCompleteComponent;
  let fixture: ComponentFixture<CheckOutCompleteComponent>;
  let serverSpy: jasmine.SpyObj<ServerService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let stateSubject: BehaviorSubject<AppState>;

  const buildState = (): AppState => {
    const state = new AppState();
    const user = new Person('1', 'Tina', 'Tester', 1, 1);
    state.currentBoat = new Boat('boat-1', 'Test Boat', false, user);
    state.currentPerson = user;
    state.reasonForCheckout = 'Testing';
    state.enableNextButton = true;
    state.enablePreviousButton = true;
    return state;
  };

  beforeEach(async () => {
    serverSpy = jasmine.createSpyObj('ServerService', ['checkoutBoat']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    stateSubject = new BehaviorSubject<AppState>(buildState());

    await TestBed.configureTestingModule({
      imports: [CheckOutCompleteComponent],
      providers: [
        { provide: ServerService, useValue: serverSpy },
        { provide: Router, useValue: routerSpy },
        { provide: StateService, useValue: { currentState: stateSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckOutCompleteComponent);
    component = fixture.componentInstance;
  });

  it('disables navigation buttons and sets display values on init', async () => {
    const state = stateSubject.value;
    serverSpy.checkoutBoat.and.returnValue(Promise.resolve(true));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(state.enableNextButton).toBeFalse();
    expect(state.enablePreviousButton).toBeFalse();
    expect(component.boatName).toBe('Test Boat');
    expect(component.userName).toBe('Tina Tester');
    expect(component.reason).toBe('Testing');
  });

  it('calls checkout service with current state details', async () => {
    const state = stateSubject.value;
    serverSpy.checkoutBoat.and.returnValue(Promise.resolve(true));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(serverSpy.checkoutBoat).toHaveBeenCalledOnceWith(
      state.currentBoat!,
      state.currentPerson,
      state.reasonForCheckout!
    );
  });

  it('navigates to login when authentication fails', async () => {
    serverSpy.checkoutBoat.and.returnValue(Promise.reject(new AuthenticationException('unauthorized')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
