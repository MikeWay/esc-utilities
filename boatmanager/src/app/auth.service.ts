import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';
import moment from "moment";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
     
    constructor(private http: HttpClient) {
    }
      
    login(email:string, password:string ) {
        return this.http.post<Token>('/api/login', {email, password})
            // this is just the HTTP call, 
                    // we still need to handle the reception of the token
            .pipe(shareReplay());
    }

    // private setSession(authResult) {
    //     const expiresAt = moment().add(authResult.expiresIn,'second');

    //     localStorage.setItem('id_token', authResult.idToken);
    //     localStorage.setItem("expires_at", JSON.stringify(expiresAt.valueOf()) );
    // }          

    logout() {
        localStorage.removeItem("id_token");
        localStorage.removeItem("expires_at");
    }

    public isLoggedIn() {
        return moment().isBefore(this.getExpiration());
    }

    isLoggedOut() {
        return !this.isLoggedIn();
    }

    getExpiration() {
        const expiration = localStorage.getItem("expires_at");
        const expiresAt = expiration ? JSON.parse(expiration) : null;
        return moment(expiresAt);
    }  
}

class Token {
      token: string;

    constructor(token: string) {
        this.token = token;
    }
}