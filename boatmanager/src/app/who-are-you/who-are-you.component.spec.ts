import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhoAreYouComponent } from './who-are-you.component';
import { Person } from '../../model/Person';
import { AppState } from '../app-state';
import { HttpClient, provideHttpClient } from '@angular/common/http';

describe('WhoAreYouComponent', () => {
  let component: WhoAreYouComponent;
  let fixture: ComponentFixture<WhoAreYouComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhoAreYouComponent],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhoAreYouComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

it('should set familyInitial when familyInitialSet is called', () => {
  const event = { target: { value: 'A' } } as unknown as Event;
  component.familyInitialSet(event);
  expect(component.familyInitial).toBe('A');
});

it('should not call server.checkPerson if form is invalid in contentChanged', async () => {
  spyOn(component['server'], 'checkPerson');
  component.familyInitial = '';
  component.month = '';
  component.day = 0;
  component.currentState = { enableNextButton: false } as any;
  await component.contentChanged();
  expect(component['server'].checkPerson).not.toHaveBeenCalled();
});

it('should handle undefined person from server in contentChanged', async () => {
  component.familyInitial = 'A';
  component.month = 'January';
  component.day = 1;
  component.currentState = { enableNextButton: true } as any;
  spyOn(component['server'], 'checkPerson').and.returnValue(Promise.resolve(null));
  spyOn(console, 'warn');
  await component.contentChanged();
  expect(console.warn).toHaveBeenCalledWith('No person found with the provided details');
});

it('should handle no person found from server in contentChanged', async () => {
  const mockState = { enableNextButton: true, currentPerson: null, updateState: () => {} };
  component.familyInitial = 'A';
  component.month = 'January';
  component.day = 1;
  component.currentState = mockState as any;
  spyOn(component['server'], 'checkPerson').and.returnValue(Promise.resolve(null));
  spyOn(component['stateService'], 'updateState');
  spyOn(console, 'warn');
  await component.contentChanged();
  expect(console.warn).toHaveBeenCalledWith('No person found with the provided details');
  expect(component.currentState).toBeDefined();
  expect(component.currentState!.enableNextButton).toBe(false);
  expect(component['stateService'].updateState).toHaveBeenCalledWith(component.currentState!);
});

it('should update state when person is found in contentChanged', async () => {
  const person = new Person('99','John', 'Doe', 1,2);
  const mockState = new AppState();
  component.familyInitial = 'A';
  component.month = 'January';
  component.day = 1;
  component.currentState = mockState as AppState;
  spyOn(component['server'], 'checkPerson').and.returnValue(Promise.resolve([person]));
  spyOn(component['stateService'], 'updateState');
  await component.contentChanged();
  expect(component.currentState.currentPerson).toEqual(person);
  expect(component.currentState.enableNextButton).toBeTrue();
  expect(component['stateService'].updateState).toHaveBeenCalledWith(component.currentState);
});
});

