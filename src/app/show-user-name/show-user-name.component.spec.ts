import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowUserNameComponent } from './show-user-name.component';

describe('ShowUserNameComponent', () => {
  let component: ShowUserNameComponent;
  let fixture: ComponentFixture<ShowUserNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowUserNameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowUserNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
