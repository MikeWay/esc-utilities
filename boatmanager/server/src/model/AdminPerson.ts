import * as crypto from 'crypto';

// Class representing a person in the system
export class AdminPerson {
    email_address: string; // Unique identifier for the person
    firstName: string; // Full name of the person
    lastName: string; //  last name of the person
    passwordHash?: string; // Optional password for the person, if needed

    constructor(
        email_address: string,
        firstName: string,
        lastName: string,

    ) {
        this.email_address = email_address;
        this.firstName = firstName;
        this.lastName = lastName;

    }

    async setPassword(password: string): Promise<string> {
        return await this.setPasswordHash(password);
    }

    private async setPasswordHash(password: string): Promise<string> {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = await new Promise<string>((resolve, reject) => {
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(salt + ':' + derivedKey.toString('hex'));
            });
        });
        this.passwordHash = hash;
        return hash;
    }

    async validatePassword(password: string): Promise<boolean> {
        if (!this.passwordHash) return false;
        const [salt, key] = this.passwordHash.split(':');
        const derivedKey = await new Promise<string>((resolve, reject) => {
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                console.log('derivedKey ===>', derivedKey.toString('hex'));
                if (err) reject(err);
                else resolve(derivedKey.toString('hex'));
            });
        });
        return key === derivedKey;
    }


    // toItem method to convert the person object to a format suitable for DynamoDB
    toItem(): {
        email_address: string,
        firstName: string,
        lastName: string,
        passwordHash?: string
    } {
        return {
            email_address: this.email_address,
            firstName: this.firstName,
            lastName: this.lastName,
            passwordHash: this.passwordHash
        };
    }

    // Static method to create a Person instance from a DynamoDB item
    static fromItem(item: {
        email_address: string,
        firstName: string,
        lastName: string,
        passwordHash?: string
    }): AdminPerson {
        const person = new AdminPerson(
            item.email_address,
            item.firstName,
            item.lastName,

        );
        person.passwordHash = item.passwordHash;
        return person;
    }
}