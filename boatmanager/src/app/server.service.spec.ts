import { TestBed } from '@angular/core/testing';

import { ServerService } from './server.service';
import { HttpClient, HttpClientModule, provideHttpClient } from '@angular/common/http';

describe('ServerService', () => {
  let service: ServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServerService, provideHttpClient()],
      imports: [] // Ensure HttpClientModule is imported
    });
    service = TestBed.inject(ServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
