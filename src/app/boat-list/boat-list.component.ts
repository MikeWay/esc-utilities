import { Component, OnInit } from '@angular/core';
import { MatChipSelectionChange, MatChipsModule } from '@angular/material/chips';
import { Boat } from '../../model/Boat'; // Adjusted the path to the correct location
import { StateService } from '../state-service';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { AppState } from '../app-state'; // Adjusted the path to the correct location
import { MatCardModule } from '@angular/material/card';
import { AuthenticationException, ServerService } from '../server.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-boat-list',
  imports: [MatChipsModule, MatCardModule],
  templateUrl: './boat-list.component.html',
  styleUrl: './boat-list.component.sass'
})
export class BoatListComponent implements OnInit {
  currentState: AppState | undefined;
  constructor(private stateService: StateService, private server: ServerService, private router: Router) { }

  public selectedBoat: Boat | undefined;

  onBoatSelectionChange($event: MatChipSelectionChange) {
    this.selectedBoat = $event.selected ? $event.source.value : undefined;
    if (this.currentState) {
      this.currentState.currentBoat = (this.selectedBoat ?? null);
      this.currentState.enableNextButton = !!this.selectedBoat; // Enable Next button if a boat is selected
      this.currentState.enablePreviousButton = true; // Enable Previous button
      console.log('Selected boat:', this.selectedBoat);
      this.stateService.updateState(this.currentState);
    }
  }

  boats: Boat[] = [];

  async ngOnInit() {
    this.selectedBoat = undefined;
    this.currentState = await firstValueFrom(this.stateService.currentState);
    try {
      if (this.currentState.checkOutInProgress) {
        this.boats = await this.server.getAvailableBoats();
      }
      else if (this.currentState.checkInInProgress) {
        this.boats = await this.server.getCheckedOutBoats();
      }

    } catch (error) {
      if (error instanceof AuthenticationException) {
        console.error('Authentication error:', error);
        this.router.navigate(['/login']);
      } else {
        console.error('Error fetching boats list:', error);
      }
      this.boats = [];
    }

    this.currentState.enableNextButton = false;
    this.currentState.enablePreviousButton = true; 
    // find the current boat in the list of boats
    if (this.currentState && this.currentState.currentBoat) {
      this.currentState.enableNextButton = true;
      this.selectedBoat = this.boats.find(boat => boat.id === this.currentState!.currentBoat?.id);
    }

  }

}
