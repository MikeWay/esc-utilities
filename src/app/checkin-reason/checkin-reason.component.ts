import { Component, OnInit } from '@angular/core';
import { MatChipListbox, MatChipOption, MatChipSelectionChange } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { AppState } from '../app-state';
import { StateService } from '../state-service';
import { ServerService, AuthenticationException } from '../server.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkin-reason',
  imports: [MatChipOption, MatChipListbox, MatCardModule],
  templateUrl: './checkin-reason.component.html',
  styleUrl: './checkin-reason.component.sass'
})
export class CheckinReasonComponent implements OnInit {
  public selectedReason: string | null = null;
  private currentState: AppState | undefined;
  public reasons: string[] = [];

  constructor(
    private stateService: StateService,
    private server: ServerService,
    private router: Router
  ) {}

  onReasonChange($event: MatChipSelectionChange) {
    this.selectedReason = $event.selected ? $event.source.value : null;
    if (this.currentState) {
      this.currentState.checkinReason = this.selectedReason;
      this.currentState.enableNextButton = !!this.selectedReason;
      this.stateService.updateState(this.currentState);
    }
  }

  async ngOnInit(): Promise<void> {
    this.currentState = await firstValueFrom(this.stateService.currentState);
    this.currentState.enableNextButton = false;
    this.selectedReason = this.currentState.checkinReason || null;
    try {
      this.reasons = await this.server.getCheckinReasons();
    } catch (error) {
      if (error instanceof AuthenticationException) {
        this.router.navigate(['/login']);
      } else {
        this.reasons = ['Boat not checked in correctly', 'Other'];
      }
    }
  }
}
