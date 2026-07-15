import { Component, OnInit, inject } from '@angular/core';
import { Defect, DefectType } from '../../model/defect';
import { ServerService } from '../server.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipListboxChange, MatChipSelectionChange, MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from "@angular/material/input";
import { MatDialog } from '@angular/material/dialog';
import { StateService } from '../state-service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppState } from '../app-state';
import { CollectFaultDetailsComponent } from '../collect-fault-details/collect-fault-details.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-report-problem',
  imports: [MatChipsModule, MatCardModule, MatInputModule, FormsModule, MatFormFieldModule],
  templateUrl: './report-problem.component.html',
  styleUrl: './report-problem.component.sass'
})
export class ReportProblemComponent implements OnInit {
  public problems: Defect[] = [];
  public additionalInfo: string = '';
  public currentState: AppState = new AppState();
  readonly dialog = inject(MatDialog);
  public chips: DefectChip[] = [];



    constructor(private stateService: StateService, private server: ServerService) {
    // Initialize server or any other dependencies here

  }

  onProblemListChange($event: MatChipListboxChange) {
    // $event.value is the array of selected values
    // Determine which problems were newly selected
    // and which were deselected
    // For newly selected problems, open the dialog to get more details
    // For deselected problems, remove them from the current state
    // and clear any additional info if necessary
    // Finally, update the current state in the state service
 
    const currentSelected: DefectChip[] = $event.value;

    const newlySelected: DefectChip[] = currentSelected.filter(chip  => chip.selected === false);

    this.chips.forEach(chip => chip.selected = false);
    currentSelected.forEach(selectedChip => {
      const chip = this.chips.find(c => c.id === selectedChip.id);
      if (chip) {
        chip.selected = true;
      }
    });
    if (newlySelected.length > 0) {
      this.getMoreDetailOfFault(newlySelected[0]);
    }

    const identifiedDefects: Defect[] = currentSelected.map(chip => chip.defect);
    // this.problems = $event.value;
    // //throw new Error('Method not implemented.');
    this.currentState!.defects = identifiedDefects;
    // this.currentState!.defectsAdditionalInfo = this.additionalInfo;
    this.currentState!.problemsWithBoat = identifiedDefects.length > 0;
    this.stateService.updateState(this.currentState!);
  }

  getMoreDetailOfFault(defectChip: DefectChip) {
    const defect = defectChip.defect;
    let dialogRef = this.dialog.open(CollectFaultDetailsComponent, {
      data: { defect: defect }
    });
    dialogRef.afterClosed().subscribe((faultDetail: any) => {
      if (faultDetail) {
        //this.currentState!.defectsAdditionalInfo = faultDetail;
        defect.additionalInfo = faultDetail;
        this.stateService.updateState(this.currentState!);
      }
    });
  }




  async ngOnInit(): Promise<void> {
    this.currentState = await firstValueFrom(this.stateService.currentState);
    const defects = await this.server.getPossibleDefectsList()
    const possibleProblems = defects.map(defectType => new Defect(defectType));
    this.chips = possibleProblems.map((defect, index) => new DefectChip(defect, false, index));

  }



}

class DefectChip {
  constructor(public defect: Defect, public selected: boolean, public id: number) { }
}
