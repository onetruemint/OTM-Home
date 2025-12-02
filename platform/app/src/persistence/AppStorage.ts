import { Persistence } from "@platform/persistence";
import { Application } from "../application/Application";

export interface AppStorage extends Persistence<Application> {
  getApplications(): Promise<Application[]>;
}
