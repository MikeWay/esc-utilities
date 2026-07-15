import { Routes } from '@angular/router';
import { CheckInOrOutComponent } from './check-in-or-out/check-in-or-out.component';
import { BoatListComponent } from './boat-list/boat-list.component';
import { WhoAreYouComponent } from './who-are-you/who-are-you.component';
import { TellUsWhyComponent } from './tell-us-why/tell-us-why.component';
import { CheckOutCompleteComponent } from './check-out-complete/check-out-complete.component';
import { LoginComponent } from './login/login.component';
import { ConfirmCheckInComponent } from './confirm-check-in/confirm-check-in.component';
import { ReportProblemComponent } from './report-problem/report-problem.component';
import { CheckInCompleteComponent } from './check-in-complete/check-in-complete.component';
import { HomeComponent } from './home/home.component';
import { CheckinReasonComponent } from './checkin-reason/checkin-reason.component';

export const routes: Routes = [
    { path: '', component: CheckInOrOutComponent },
    { path: 'Home', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'check-in-or-out', component: CheckInOrOutComponent },
    { path: 'boat-list', component: BoatListComponent },
    { path: 'who-are-you', component: WhoAreYouComponent },
    { path: 'tell-us-why', component: TellUsWhyComponent },
    { path: 'check-out-complete', component: CheckOutCompleteComponent },
    { path: 'confirm-check-in', component: ConfirmCheckInComponent }, // Assuming this is the start of the check-in process
    { path: 'report-problem', component: ReportProblemComponent },
    { path: 'checkin-reason', component: CheckinReasonComponent },
    { path: 'check-in-complete', component: CheckInCompleteComponent }, // Assuming this is the end of the check-in process
    { path: '**', redirectTo: '' }
];
