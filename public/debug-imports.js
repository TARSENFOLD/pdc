// Script to check actual JavaScript errors at runtime
(async () => {
  try {
    // Try to fetch and parse the main.jsx module
    const response = await fetch('/src/main.jsx');
    const code = await response.text();
    
    console.log('main.jsx fetched successfully');
    console.log('Length:', code.length);
    
    // Check for syntax errors
    try {
      new Function(code);
      console.log('No syntax errors in main.jsx');
    } catch (e) {
      console.error('Syntax error in main.jsx:', e.message);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Now try to import the App
  try {
    const { default: App } = await import('/src/App.jsx?import');
    console.log('App imported successfully');
  } catch (e) {
    console.error('Error importing App:', e.message);
    console.error('Stack:', e.stack);
  }

  // Try to import the barrel export
  try {
    const modules = await import('/src/components/shared/index.js?import');
    console.log('Barrel export imports:', Object.keys(modules));
  } catch (e) {
    console.error('Error importing barrel export:', e.message);
  }
})();
