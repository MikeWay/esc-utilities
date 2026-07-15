import * as fs from 'fs';

export class Config {
    private static instance: Config;
    private config: Record<string, any>;
    
    private constructor() {
        this.config = {};
        // Load config from a config file or environment variables if needed
        // For example, you could load from a JSON file or set defaults
        this.config['appName'] = 'My Application';
        this.config['version'] = '1.0.0';
        this.config['port'] = 3000; // Default port
        this.config.BOAT_TABLE_NAME = 'Boats'; // Default table name for boats
        this.config.LOG_TABLE_NAME = 'Rib_Logs'; // Default table name for logs
        this.config.checkout_reasons = [
            'Engine hours',
            'Maintenance',
            'Fuel',
            'Other',
        ];    
        this.config['region'] = 'eu-west-1'; // Default AWS region

        // Add more default configurations as needed
        // You can also load configurations from a file or environment variables here
        // Example: 
        this.loadConfigFromFile('config.json');
    }
    private loadConfigFromFile(configFile: string) {

        // Implement logic to read from a JSON file or other sources
        // For example, you could use fs.readFileSync to read a JSON file
        // and then parse it to populate this.config

        const data = fs.readFileSync(configFile, 'utf8');
        try {
            const loadedConfig = JSON.parse(data);
            this.config = { ...this.config, ...loadedConfig };
        } catch (error) {
            console.error(`Error parsing configuration file ${configFile}:`, error);
            // Handle error appropriately, e.g., set defaults or throw an error
            this.config = {}; // Reset to empty config or set defaults
        }
        }
// Singleton pattern to ensure only one instance of Config exists
// This allows global access to configuration settings throughout the application
// Usage: Config.getInstance().get('appName');
// Usage: Config.getInstance().set('appName', 'New App Name');

    
    public static getInstance(): Config {
        if (!Config.instance) {
        Config.instance = new Config();
        }
        return Config.instance;
    }
    
    public set(key: string, value: any): void {
        this.config[key] = value;
    }
    
    public get(key: string): any {
        return this.config[key];
    }
    
    public has(key: string): boolean {
        return key in this.config;
    }       
}