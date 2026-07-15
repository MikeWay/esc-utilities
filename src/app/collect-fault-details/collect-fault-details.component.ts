import { CommonModule } from '@angular/common';
import { Component, inject, Inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Defect, DefectType } from '../../model/defect';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';


@Component({
  selector: 'app-collect-fault-details',
  imports: [MatFormFieldModule, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatInputModule],
  templateUrl: './collect-fault-details.component.html',
  styleUrl: './collect-fault-details.component.sass'
})
export class CollectFaultDetailsComponent {
  @Input()
  public defect: DefectType | undefined
  readonly dialogRef = inject(MatDialogRef<CollectFaultDetailsComponent>);

  public faultDetail: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { defect: Defect }) {
    this.defect = data.defect.defectType;
    this.faultDetail = data.defect.additionalInfo;
  }

  onCancel() {
    this.dialogRef.close();
  }
  onOk() {
    this.dialogRef.close(this.faultDetail);
  }

}
