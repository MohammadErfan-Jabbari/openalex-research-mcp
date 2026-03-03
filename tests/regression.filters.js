#!/usr/bin/env node

/**
 * Regression checks for previously failing OpenAlex query patterns.
 * These tests validate OpenAlex-side contract assumptions used by the MCP server.
 */

import axios from 'axios';

const API_BASE = 'https://api.openalex.org';
const DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(name, fn) {
  try {
    process.stdout.write(`${name}... `);
    await fn();
    console.log('ok');
    return true;
  } catch (error) {
    console.log('fail');
    console.error(`  ${name}: ${error.message}`);
    if (error.response) {
      console.error(`  status=${error.response.status}`);
      console.error(`  body=${JSON.stringify(error.response.data).slice(0, 500)}`);
    }
    return false;
  }
}

async function run() {
  const results = [];

  await sleep(DELAY_MS);
  results.push(await check('locations.source.id filter is accepted', async () => {
    const response = await axios.get(`${API_BASE}/works`, {
      params: {
        filter: 'locations.source.id:https://openalex.org/S4306420609,publication_year:2022-2026',
        per_page: 1,
      },
    });
    if (!response.data.meta) {
      throw new Error('missing meta response');
    }
  }));

  await sleep(DELAY_MS);
  results.push(await check('source name can resolve to source IDs', async () => {
    const response = await axios.get(`${API_BASE}/sources`, {
      params: {
        search: 'Neural Information Processing Systems',
        per_page: 5,
      },
    });
    const ids = (response.data.results || []).map((r) => r.id).filter(Boolean);
    if (ids.length === 0) {
      throw new Error('no source IDs resolved from venue name search');
    }
  }));

  await sleep(DELAY_MS);
  results.push(await check('relevance_score:desc sort is accepted', async () => {
    const response = await axios.get(`${API_BASE}/works`, {
      params: {
        search: 'knowledge distillation',
        filter: 'publication_year:2022-2026',
        sort: 'relevance_score:desc',
        per_page: 1,
      },
    });
    if (!response.data.meta) {
      throw new Error('missing meta response');
    }
  }));

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\nRegression checks: ${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
