#!/usr/bin/env node

/**
 * Development server setup for testing Smartling plugin against v2 API
 * 
 * This script helps set up a local development environment to test the 
 * Smartling plugin against the new v2 API found in builder-internal.
 * 
 * Usage:
 * 1. Make sure builder-internal is cloned and set up
 * 2. Run: node dev-server.js
 * 3. The plugin will automatically use the local API when in development mode
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Wrap in try-catch to handle any errors
try {
  const BUILDER_INTERNAL_PATH = path.resolve(__dirname, '../../../builder-internal');

  console.log('🚀 Starting Smartling Plugin Development Server');
  console.log('📂 Checking for builder-internal...');

  // Check if builder-internal exists
  if (!fs.existsSync(BUILDER_INTERNAL_PATH)) {
    console.error('❌ builder-internal not found at:', BUILDER_INTERNAL_PATH);
    console.log('Please ensure builder-internal is cloned as a sibling directory to this repo');
    process.exit(1);
  }

  console.log('✅ Found builder-internal at:', BUILDER_INTERNAL_PATH);

  // Check if the v2 API file exists
  const smartlingApiPath = path.join(BUILDER_INTERNAL_PATH, 'packages/api/src/smartling.ts');
  if (!fs.existsSync(smartlingApiPath)) {
    console.error('❌ v2 API file not found at:', smartlingApiPath);
    process.exit(1);
  }

  console.log('✅ Found v2 API file at:', smartlingApiPath);

  console.log('\n📋 Development Setup Instructions:');
  console.log('1. In one terminal, run the builder-internal API server:');
  console.log(`   cd ${BUILDER_INTERNAL_PATH}`);
  console.log('   npm install');
  console.log('   npm run dev  # or whatever command starts the API server');
  console.log('');
  console.log('2. In another terminal, run this plugin in development mode:');
  console.log(`   cd ${__dirname}`);
  console.log('   npm run start  # This starts the plugin in watch mode');
  console.log('');
  console.log('3. When testing in Builder, add ?smartling-dev=true to the URL to force using local API');
  console.log('');
  console.log('🔧 The plugin will automatically detect development mode and use:');
  console.log('   http://localhost:3000/api/v2/smartling/');
  console.log('');
  console.log('📝 To modify the local API endpoint, edit src/smartling-dev.ts');

  // Optionally start the plugin in watch mode
  console.log('\n🤔 Start plugin in watch mode now? (y/n)');

  // Handle stdin properly
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🚀 Starting plugin in watch mode...');
      try {
        const child = spawn('npm', ['run', 'start'], {
          stdio: 'inherit',
          cwd: __dirname
        });
        
        child.on('exit', (code) => {
          console.log(`Plugin development server exited with code ${code || 0}`);
          process.exit(Number(code) || 0);
        });
        
        child.on('error', (error) => {
          console.error('Failed to start plugin development server:', error.message);
          process.exit(1);
        });
      } catch (spawnError) {
        console.error('Error spawning process:', spawnError.message);
        process.exit(1);
      }
    } else {
      console.log('\n👍 Manual setup - follow the instructions above');
      process.exit(0);
    }
  });

} catch (error) {
  console.error('Script error:', error.message);
  process.exit(1);
}