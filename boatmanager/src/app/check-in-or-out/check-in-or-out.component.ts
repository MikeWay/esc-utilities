import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { StateService } from '../state-service';
import { firstValueFrom } from 'rxjs';
import { AppState } from '../app-state';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-check-in-or-out',
    imports: [MatButtonToggleModule],
    templateUrl: './check-in-or-out.component.html',
    styleUrl: './check-in-or-out.component.sass'
})



export class CheckInOrOutComponent implements OnInit {
    currentState: AppState | undefined;
    inOut: string = ''; // Default to check-in



    constructor(private stateService: StateService, private route: ActivatedRoute) { }



    async onToggleChange(event: MatButtonToggleChange): Promise<void> {
        // Handle toggle change logic here
        if (!this.currentState) {
            this.currentState = await firstValueFrom(this.stateService.currentState);
        }

        //let currentState = await this.stateService.currentState.firstValueFrom();

        if (event.value === 'check-in') {
            console.log('Check In selected');
            this.inOut = 'checkIn';
            // You can add logic to switch between check-in and check-out modes
            this.currentState.checkOutInProgress = false;
            this.currentState.checkInInProgress = true;
        } else if (event.value === 'check-out') {
            console.log('Check Out selected');
            this.inOut = 'checkOut';
            this.currentState.checkOutInProgress = true;
            this.currentState.checkInInProgress = false;
        }
        // You can add logic to switch between check-in and check-out modes
        this.currentState.enableNextButton = true; // Enable Next button
        this.stateService.updateState(this.currentState);
    }

    async ngOnInit(): Promise<void> {

        let resetParam: string | null = null;
        this.route.queryParams.subscribe(async params => {
            resetParam = params['reset'];
            if (resetParam && resetParam === 'true') {
                // Reset state if reset query parameter is set
                await this.stateService.resetState();
            }
        });
        //const resetParam = routesnapshot.queryParamMap.get('reset');

        this.currentState = await firstValueFrom(this.stateService.currentState);
        console.log('Current state:', this.currentState);
        this.currentState.enableNextButton = false; // Disable Next button initially
        this.currentState.enablePreviousButton = false; // Disable Previous button initially
        if (this.currentState.checkOutInProgress) {
            this.inOut = 'checkOut';
            this.currentState.enableNextButton = true; // Enable Next button for check-out
        }
        if (this.currentState.checkInInProgress) {
            this.inOut = 'checkIn';
            this.currentState.enableNextButton = true; // Enable Next button for check-in
        }
    }
}
