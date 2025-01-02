declare namespace GoogleAppsScript {
  interface BigQuery {
    Tables: TablesCollection;
    Jobs: JobsCollection;
  }

  interface TablesCollection {
    create(projectId: string, datasetId: string, tableSpec: TableSpec): Promise<Table>;
    remove(projectId: string, datasetId: string, tableId: string): Promise<void>;
  }

  interface JobsCollection {
    insert(projectId: string, jobSpec: JobSpec): Promise<JobResponse>;
    query(projectId: string, queryRequest: QueryRequest, transaction?: Transaction): Promise<QueryResponse>;
    beginTransaction(projectId: string): Promise<Transaction>;
    commitTransaction(projectId: string, transaction: Transaction): Promise<void>;
    rollbackTransaction(projectId: string, transaction: Transaction): Promise<void>;
  }

  interface TableSpec {
    tableReference: {
      projectId: string;
      datasetId: string;
      tableId: string;
    };
    schema: {
      fields: Array<{
        name: string;
        type: string;
        mode?: 'REQUIRED' | 'NULLABLE' | 'REPEATED';
      }>;
    };
  }

  interface Table {
    tableReference: {
      projectId: string;
      datasetId: string;
      tableId: string;
    };
    schema: {
      fields: Array<{
        name: string;
        type: string;
        mode?: 'REQUIRED' | 'NULLABLE' | 'REPEATED';
      }>;
    };
  }

  interface JobSpec {
    configuration: {
      query: {
        query: string;
        parameterMode?: 'NAMED' | 'POSITIONAL';
        queryParameters?: Array<{
          name: string;
          parameterType: { type: string };
          parameterValue: { value: string };
        }>;
      };
    };
  }

  interface JobResponse {
    status: {
      state: 'PENDING' | 'RUNNING' | 'DONE';
      errorResult?: {
        reason: string;
        message: string;
      };
    };
  }

  interface QueryRequest {
    query: string;
    parameterMode?: 'NAMED' | 'POSITIONAL';
    queryParameters?: Array<{
      name: string;
      parameterType: { type: string };
      parameterValue: { value: string };
    }>;
  }

  interface QueryRow {
    f: Array<{
      v: string;
    }>;
  }

  interface QueryResponse {
    jobComplete: boolean;
    rows: QueryRow[];
    totalRows?: string;
    pageToken?: string;
    schema?: {
      fields: Array<{
        name: string;
        type: string;
        mode?: string;
      }>;
    };
  }

  interface Transaction {
    id: string;
    state: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK';
  }
}

declare const BigQuery: GoogleAppsScript.BigQuery;
