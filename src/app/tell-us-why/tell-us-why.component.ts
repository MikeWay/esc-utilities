import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

import { MatChipListbox, MatChipOption, MatChipSelectionChange } from '@angular/material/chips';
import { AppState } from '../app-state';
import { StateService } from '../state-service';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'app-tell-us-why',
  imports: [MatChipOption, MatChipListbox,MatCardModule],
  templateUrl: './tell-us-why.component.html',
  styleUrl: './tell-us-why.component.sass'
})
export class TellUsWhyComponent implements OnInit {
  public selectedReason: string | null = null;
  private currentState: AppState | undefined;
  public reasons: string[] = [];
  constructor(public stateService: StateService) { }


  onReasonChange($event: MatChipSelectionChange) {
    this.selectedReason = $event.selected ? $event.source.value : undefined;
    if (this.currentState) {
      this.currentState.reasonForCheckout = this.selectedReason;
      this.currentState.enableNextButton = !!this.selectedReason; // Enable Next button if a reason is selected
      this.currentState.enablePreviousButton = true; // Enable Previous button
      console.log('Reason for checkout:', this.selectedReason);
      this.stateService.updateState(this.currentState);
    }
  }

  async ngOnInit(): Promise<void> {
    // Initialization logic if needed
    console.log('TellUsWhyComponent initialized');
    this.reasons = environment.checkout_reasons;
    this.currentState = await firstValueFrom(this.stateService.currentState);
    this.currentState.enableNextButton = false;    
    this.selectedReason = this.currentState.reasonForCheckout || null;
  }



}
