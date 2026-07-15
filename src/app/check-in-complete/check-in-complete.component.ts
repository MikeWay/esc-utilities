import { Component, OnInit } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { Router } from '@angular/router';
import { AuthenticationException, ServerService } from '../server.service';
import { StateService } from '../state-service';
import { AppState } from '../app-state';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-check-in-complete',
  imports: [MatCardModule],
  templateUrl: './check-in-complete.component.html',
  styleUrl: './check-in-complete.component.sass'
})
export class CheckInCompleteComponent implements OnInit {

  currentState: AppState | null = null;
  
  constructor(private stateService: StateService, private server: ServerService, private router: Router) { }

  async ngOnInit(): Promise<void> {
    // Perform any initialization logic here
    console.log('CheckInCompleteComponent initialized');
    this.currentState = await firstValueFrom(this.stateService.currentState);
    this.currentState.enableNextButton = false;


      try {
        // Do the actual check-in
        if (this.currentState && this.currentState.currentBoat) {
          const userCheckingIn = (this.currentState.notTheOriginalUser && this.currentState.currentPerson)
            ? this.currentState.currentPerson
            : this.currentState.currentBoat.checkedOutTo;
          if (userCheckingIn) {
            const success = await this.server.checkInBoat(this.currentState.currentBoat, userCheckingIn,
                this.currentState.defects,
                this.currentState.engineHours, this.currentState.returnedKey, this.currentState.refueledBoat);
            if (success) {
              console.log('Check-in successful');
            } else {
              console.error('Check-in failed');
            }
          }
        }
      } catch (error) {
        if (error instanceof AuthenticationException) {
          console.error('Authentication error:', error);
          this.router.navigate(['/login']);
        }
      }
    };
  }


