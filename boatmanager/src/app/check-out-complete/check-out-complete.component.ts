import { Component, OnInit } from '@angular/core';
import { StateService } from '../state-service';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { AuthenticationException, ServerService } from '../server.service';
import { Router } from '@angular/router';
import { AppState } from '../app-state';

@Component({
  selector: 'app-check-out-complete',
  imports: [MatCardModule],
  templateUrl: './check-out-complete.component.html',
  styleUrl: './check-out-complete.component.sass'
})
export class CheckOutCompleteComponent implements OnInit {
  boatName: any;
  userName: any;
  reason: any;
  currentState: AppState | null = null;
  constructor(private stateService: StateService, private server: ServerService, private router: Router) { }


  async ngOnInit() {

    this.currentState = await firstValueFrom(this.stateService.currentState);
    this.currentState.enableNextButton = false;
    this.currentState.enablePreviousButton = false;
    this.boatName = this.currentState.currentBoat?.name || 'Unknown Boat';
    this.userName = `${this.currentState.currentPerson?.firstName} ${this.currentState.currentPerson?.lastName}` || 'Unknown User';
    this.reason = this.currentState.reasonForCheckout || 'No reason provided';

    try {
      // Do the actual checkout
      if (this.currentState.currentBoat && this.currentState.currentPerson) {
        const success = await this.server.checkoutBoat(this.currentState.currentBoat, this.currentState.currentPerson, this.reason);
        if (success) {
          console.log('Checkout successful');
        } else {
          console.error('Checkout failed');
        }
      }
    } catch (error) {
      if (error instanceof AuthenticationException) {
        console.error('Authentication error:', error);
        this.router.navigate(['/login']);
      }
    }

  }
}
