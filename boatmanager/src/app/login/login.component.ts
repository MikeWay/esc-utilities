import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { MatCard } from "@angular/material/card";
import { MatCardHeader, MatCardContent, MatCardTitle, MatCardActions } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCard, MatCardHeader, MatCardContent, MatCardTitle, MatInputModule, MatCardActions, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.sass'
})
export class LoginComponent {
    form:FormGroup;
    hostname: string = window.location.hostname;

    constructor(private fb:FormBuilder, 
                 private authService: AuthService, 
                 private router: Router) {

        this.form = this.fb.group({
            email: ['',Validators.required],
            password: ['',Validators.required]
        });
    }

    login() {
        const val = this.form.value;

        if (val.email && val.password) {
            this.authService.login(val.email, val.password)
                .subscribe(
                    (token) => {
                        console.log("User is logged in");
                        this.router.navigateByUrl('/');
                        localStorage.setItem('authToken', token.token);
                    }
                );
        }
    }
}
