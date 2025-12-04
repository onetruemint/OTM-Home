# OneTrueMint Home

## Overview

OneTrueMint Home is your interface to a suite of services to manage an adults' home.
Designed as a set of microservices, OneTrueMint Home runs on your home Wi-fi and is
completely isolated to itself. So your data does not leave the system!

## Products

- Home Inventory (In Progress): Track items like toiletries, ingredients, and perishables
  right from your phone.
- Mint Home (In Progress): The portal to the OneTrueMint Home suite of products.

## Structure

There are two key elements that make up the structure of the OneTrueMint Home monorepo

### Apps

The `apps` directory is where all the live. These are all the products that make up the OneTrueMint Home Suite.

### Packages

The `packages` directory houses common code for reuse across all microservices. This includes interfaces to interact with the message broker, database, AI, logging, and many other deployments.

## Key Technology Used

For anyone curious to the stack, the following are the key technologies used for this project

- Node: All products are Node applications with Rest API interfaces.
- Express.js: Express for routing and creating the Rest API interface.
- Next.js/React: Next JS is used to create any frontends and UIs.
- Postgres: The relational database for structured data.
- MongoDB: The NoSQL database for unstructured data.
- Apache Kafka: Enables pub/sub communication across microservices so the state of the platform can be inferred.
- Turborepo: Vercel's product for fast builds and CI/CD.
- Jenkins: CI/CD pipeline.
- Elasticsearch, Logstash, Kibana (ELK) stack: logging
