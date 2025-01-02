/**
 * Database integration tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG } from '../Config';

interface DatabaseTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  testTableName?: string;
  testData?: Record<string, any>;
  [key: string]: any;
}

const DatabaseTests: DatabaseTestSuite = {
  name: 'Database Tests',
  
  async setup() {
    // Set up test table and data
    this.testTableName = `test_table_${Date.now()}`;
    this.testData = {
      id: 'test_id_1',
      name: 'Test Record',
      created_at: new Date().toISOString(),
      data: { key: 'value' }
    };
    
    // Create test table
    await BigQuery.Tables.create(
      CONFIG.PROJECT_ID,
      CONFIG.DATASET_ID,
      {
        tableReference: {
          projectId: CONFIG.PROJECT_ID,
          datasetId: CONFIG.DATASET_ID,
          tableId: this.testTableName
        },
        schema: {
          fields: [
            { name: 'id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'name', type: 'STRING' },
            { name: 'created_at', type: 'TIMESTAMP' },
            { name: 'data', type: 'JSON' }
          ]
        }
      }
    );
  },
  
  async teardown() {
    // Drop test table
    if (this.testTableName) {
      try {
        await BigQuery.Tables.remove(
          CONFIG.PROJECT_ID,
          CONFIG.DATASET_ID,
          this.testTableName
        );
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  },
  
  async testInsert() {
    if (!this.testTableName || !this.testData) {
      throw new Error('Test table or data not initialized');
    }

    const result = await BigQuery.Jobs.insert(
      CONFIG.PROJECT_ID,
      {
        configuration: {
          query: {
            query: `
              INSERT INTO \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
              (id, name, created_at, data)
              VALUES
              (@id, @name, @created_at, @data)
            `,
            parameterMode: 'NAMED',
            queryParameters: [
              { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } },
              { name: 'name', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.name } },
              { name: 'created_at', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: this.testData.created_at } },
              { name: 'data', parameterType: { type: 'JSON' }, parameterValue: { value: JSON.stringify(this.testData.data) } }
            ]
          }
        }
      }
    );
    
    assert(result.status.state === 'DONE', 'Insert job should complete');
    assert(!result.status.errorResult, 'Insert should not have errors');
  },
  
  async testSelect() {
    if (!this.testTableName || !this.testData) {
      throw new Error('Test table or data not initialized');
    }

    const result = await BigQuery.Jobs.query(
      CONFIG.PROJECT_ID,
      {
        query: `
          SELECT *
          FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
          WHERE id = @id
        `,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } }
        ]
      }
    );
    
    assert(result.rows.length === 1, 'Should find one record');
    const row = result.rows[0];
    assert(row.f.length >= 4, 'Row should have all fields');
    assertEqual(row.f[0].v, this.testData.id, 'ID should match');
    assertEqual(row.f[1].v, this.testData.name, 'Name should match');
    assert(row.f[2].v !== undefined && row.f[2].v !== null, 'Created at should be set');
    assertEqual(
      JSON.parse(row.f[3].v),
      this.testData.data,
      'JSON data should match'
    );
  },
  
  async testUpdate() {
    if (!this.testTableName || !this.testData) {
      throw new Error('Test table or data not initialized');
    }

    const updatedName = 'Updated Test Record';
    const result = await BigQuery.Jobs.query(
      CONFIG.PROJECT_ID,
      {
        query: `
          UPDATE \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
          SET name = @name
          WHERE id = @id
        `,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } },
          { name: 'name', parameterType: { type: 'STRING' }, parameterValue: { value: updatedName } }
        ]
      }
    );
    
    assert(result.jobComplete, 'Update should complete');
    
    // Verify update
    const verify = await BigQuery.Jobs.query(
      CONFIG.PROJECT_ID,
      {
        query: `
          SELECT name
          FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
          WHERE id = @id
        `,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } }
        ]
      }
    );
    
    assert(verify.rows.length === 1, 'Should find updated record');
    assertEqual(verify.rows[0].f[0].v, updatedName, 'Name should be updated');
  },
  
  async testDelete() {
    if (!this.testTableName || !this.testData) {
      throw new Error('Test table or data not initialized');
    }

    const result = await BigQuery.Jobs.query(
      CONFIG.PROJECT_ID,
      {
        query: `
          DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
          WHERE id = @id
        `,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } }
        ]
      }
    );
    
    assert(result.jobComplete, 'Delete should complete');
    
    // Verify deletion
    const verify = await BigQuery.Jobs.query(
      CONFIG.PROJECT_ID,
      {
        query: `
          SELECT COUNT(*) as count
          FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
          WHERE id = @id
        `,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: this.testData.id } }
        ]
      }
    );
    
    assert(verify.rows.length === 1, 'Should get count');
    assertEqual(verify.rows[0].f[0].v, '0', 'Record should be deleted');
  },
  
  async testTransaction() {
    if (!this.testTableName) {
      throw new Error('Test table not initialized');
    }

    // Start transaction
    const transaction = await BigQuery.Jobs.beginTransaction(CONFIG.PROJECT_ID);
    
    try {
      // Insert two records
      await BigQuery.Jobs.query(
        CONFIG.PROJECT_ID,
        {
          query: `
            INSERT INTO \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
            (id, name)
            VALUES
            (@id1, @name1),
            (@id2, @name2)
          `,
          parameterMode: 'NAMED',
          queryParameters: [
            { name: 'id1', parameterType: { type: 'STRING' }, parameterValue: { value: 'tx_1' } },
            { name: 'name1', parameterType: { type: 'STRING' }, parameterValue: { value: 'Transaction Test 1' } },
            { name: 'id2', parameterType: { type: 'STRING' }, parameterValue: { value: 'tx_2' } },
            { name: 'name2', parameterType: { type: 'STRING' }, parameterValue: { value: 'Transaction Test 2' } }
          ]
        },
        transaction
      );
      
      // Intentionally fail second operation
      await BigQuery.Jobs.query(
        CONFIG.PROJECT_ID,
        {
          query: `
            UPDATE \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
            SET invalid_column = @value
            WHERE id = @id
          `,
          parameterMode: 'NAMED',
          queryParameters: [
            { name: 'id', parameterType: { type: 'STRING' }, parameterValue: { value: 'tx_1' } },
            { name: 'value', parameterType: { type: 'STRING' }, parameterValue: { value: 'should fail' } }
          ]
        },
        transaction
      );
      
      await BigQuery.Jobs.commitTransaction(CONFIG.PROJECT_ID, transaction);
      assert(false, 'Transaction should fail');
    } catch (error) {
      await BigQuery.Jobs.rollbackTransaction(CONFIG.PROJECT_ID, transaction);
      
      // Verify rollback
      const verify = await BigQuery.Jobs.query(
        CONFIG.PROJECT_ID,
        {
          query: `
            SELECT COUNT(*) as count
            FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.${this.testTableName}\`
            WHERE id IN ('tx_1', 'tx_2')
          `
        }
      );
      
      assert(verify.rows.length === 1, 'Should get count');
      assertEqual(verify.rows[0].f[0].v, '0', 'Records should be rolled back');
    }
  }
};

export default DatabaseTests;
