Feature: Test basic network features
  Background: Setup local blockchain and bootstraps
    Given the blockchain is set up
    And 1 bootstrap is running

  Scenario: Start network with 5 nodes and check do they see each other
    Given I setup 5 nodes
    And I start the nodes
    Then all nodes should be aware of each other

  Scenario: Test replication DC -> DH
    Given the replication factor is 4
    And I setup 5 nodes
    And I start the nodes
    And I use 1st node as DC
    And I import "importers/xml_examples/Retail/01_Green_to_pink_shipment.xml" as GS1
    Then the last import's hash should be the same as one manually calculated
    Given I initiate the replication
    And I wait for replications to finish
    Then the last import should be the same on all nodes that replicated data

  Scenario: Check that second gs1 import does not mess up first import hash value
    Given I setup 2 nodes
    And I start the nodes
    And I use 1st node as DC
    And I import "importers/xml_examples/Basic/01_Green_to_pink_shipment.xml" as GS1
    Given I initiate the replication
    And I wait for replications to finish
    And I remember previous import's fingerprint value and details
    And I import "importers/xml_examples/Basic/02_Green_to_pink_shipment.xml" as GS1
    Then checking again first import hash should point to remembered value

  Scenario: Check that second wot import does not mess up first import hash value
    Given I setup 2 nodes
    And I start the nodes
    And I use 1st node as DC
    And I import "importers/json_examples/WOT_Example_1.json" as WOT
    Given I initiate the replication
    And I wait for replications to finish
    And I remember previous import's fingerprint value and details
    And I import "importers/json_examples/WOT_Example_2.json" as WOT
    Then checking again first import hash should point to remembered value

  Scenario: Smoke check data-layer basic endpoints
    Given I setup 2 nodes
    And I start the nodes
    And I use 1st node as DC
    And I import "importers/xml_examples/Basic/01_Green_to_pink_shipment.xml" as GS1
    Given I call api-query-local with query consisting of path: "identifiers.id", value: "urn:epc:id:sgtin:Batch_1" and opcode: "EQ" for last import
    Then api-query-local response should have certain structure
    Given I call api-query-local-import with query consisting of path: "identifiers.id", value: "urn:epc:id:sgtin:Batch_1" and opcode: "EQ" for last import
    Then api-query-local-import response should have certain structure
    Given I call api-query-local-import-importId endpoint for last import
    Then api-query-local-import-importId response should have certain structure