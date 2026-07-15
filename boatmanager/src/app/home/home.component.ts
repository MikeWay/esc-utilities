import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StateService } from '../state-service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.sass'
})
export class HomeComponent implements OnInit {

  constructor(private router: Router, private stateService: StateService,) { }
  
  async ngOnInit(): Promise<void> {
    // Initialization logic here
    await this.stateService.resetState();
    this.router.navigate(['/check-in-or-out']);
  }

}
