# Three.js Dash Docset Generator - Dependency Update Plan

## Current State Analysis

### Project Overview
- **Purpose**: Generates Three.js documentation as Dash docsets
- **Language**: CoffeeScript (Node.js)
- **Last Major Update**: ~2015 (based on dependency versions)
- **Current Three.js Version**: r72 (heavily outdated)

### Critical Issues Identified

1. **PhantomJS Deprecated**: The `phantom` package (v0.8.0) is deprecated since 2018
2. **Severely Outdated Dependencies**: All npm packages are 7-10 years old
3. **Security Vulnerabilities**: Old packages likely contain security issues
4. **Three.js Submodule**: Using r72 (current is r160+)
5. **Node.js Compatibility**: May not work with modern Node.js versions

## Dependency Analysis

### Current Dependencies (package.json)
```json
{
  "connect": "^2.8.4",      // Latest: 3.7.0 (middleware framework)
  "event-stream": "^3.3.1", // Latest: 4.0.1 (stream utilities)
  "ncp": "^2.0.0",          // Latest: 2.0.0 (file copying)
  "phantom": "^0.8.0",      // Latest: 6.3.0 (DEPRECATED - needs replacement)
  "q": "^1.4.1",           // Latest: 2.0.3 (promises - can be replaced with native)
  "sqlite3": "^3.1.0"      // Latest: 5.1.7 (SQLite database)
}
```

### Recommended Updates

#### Phase 1: Critical Replacements

1. **Replace PhantomJS with Puppeteer**
   - **Current**: `phantom@0.8.0` (deprecated)
   - **Replacement**: `puppeteer@21.6.1` or `playwright@1.40.1`
   - **Reason**: PhantomJS is deprecated; modern alternatives are faster and more reliable
   - **Impact**: Requires rewriting browser automation code

2. **Update Three.js Submodule**
   - **Current**: r72 (2015)
   - **Target**: Latest stable (r160+)
   - **Impact**: Documentation structure may have changed significantly

#### Phase 2: Dependency Updates

3. **Update Core Dependencies**
   ```json
   {
     "connect": "^3.7.0",           // +major version (breaking changes)
     "event-stream": "^4.0.1",      // +major version
     "ncp": "^2.0.0",               // already latest
     "sqlite3": "^5.1.7",          // +major versions (may need rebuild)
     "puppeteer": "^21.6.1"        // new dependency
   }
   ```

4. **Remove/Replace Obsolete Dependencies**
   - **Remove**: `q` (replace with native Promises)
   - **Remove**: `phantom` (replace with Puppeteer)

#### Phase 3: Development Dependencies

5. **Add Modern Tooling**
   ```json
   {
     "coffee-script": "^1.12.7",   // CoffeeScript compiler
     "@types/node": "^20.0.0",     // TypeScript definitions
     "nodemon": "^3.0.0"           // Development server
   }
   ```

## Implementation Strategy

### Phase 1: Environment Setup (1-2 days)

1. **Update Node.js**
   - Target: Node.js 18+ LTS
   - Test compatibility with current code

2. **Update Package Manager**
   - Update npm to latest version
   - Consider migrating to npm workspaces or yarn

3. **Backup Current Setup**
   - Create backup branch
   - Document current functionality

### Phase 2: PhantomJS Replacement (3-5 days)

1. **Choose Replacement Tool**
   - **Recommended**: Puppeteer (most similar to current PhantomJS usage)
   - **Alternative**: Playwright (more features, cross-browser support)

2. **Rewrite Browser Automation (app.coffee)**
   - Replace PhantomJS API calls with Puppeteer equivalents
   - Update page navigation and element selection logic
   - Maintain same functionality for docset generation

3. **Key Code Changes Required**
   ```coffeescript
   # Current PhantomJS approach
   phantom.create (ph) ->
     ph.createPage (page) ->
       page.open url, callback
   
   # New Puppeteer approach
   browser = await puppeteer.launch()
   page = await browser.newPage()
   await page.goto(url)
   ```

### Phase 3: Core Dependencies (2-3 days)

1. **Update SQLite3**
   - May require native module rebuild
   - Test database creation and querying

2. **Update Connect Framework**
   - Review middleware changes between v2 and v3
   - Update static file serving configuration

3. **Update Event-Stream**
   - Test file processing pipelines
   - Ensure stream transformations still work

4. **Replace Q Promises**
   - Convert to native async/await or Promise chains
   - Simplify asynchronous code flow

### Phase 4: Three.js Update (3-7 days)

1. **Update Submodule**
   ```bash
   cd three.js
   git fetch origin
   git checkout r160  # or latest stable
   ```

2. **Analyze Documentation Changes**
   - Compare r72 vs latest documentation structure
   - Identify breaking changes in file organization
   - Update file paths and selectors in scraping logic

3. **Update Parsing Logic**
   - Modify HTML parsing for new documentation format
   - Update CSS selectors for new documentation layout
   - Test docset generation with latest docs

### Phase 5: Testing & Validation (2-3 days)

1. **Functional Testing**
   - Generate complete docset with updated dependencies
   - Verify all documentation sections are captured
   - Test docset installation and browsing in Dash

2. **Performance Testing**
   - Compare generation speed with old vs new setup
   - Monitor memory usage during generation
   - Test with different Three.js versions

3. **Cross-Platform Testing**
   - Test on different Node.js versions (16, 18, 20)
   - Verify on different operating systems

## Risk Assessment & Mitigation

### High Risk Items

1. **Three.js Documentation Structure Changes**
   - **Risk**: Major documentation layout changes may break parsing
   - **Mitigation**: Gradual three.js version updates, extensive testing

2. **PhantomJS to Puppeteer Migration**
   - **Risk**: Complex browser automation logic may not translate directly
   - **Mitigation**: Careful API mapping, comprehensive testing

### Medium Risk Items

1. **SQLite3 Native Module**
   - **Risk**: May fail to compile on some systems
   - **Mitigation**: Provide pre-built binaries, Docker support

2. **Connect Middleware Changes**
   - **Risk**: Breaking changes in v3 API
   - **Mitigation**: Review migration guide, test thoroughly

## Proposed Timeline

### Week 1
- **Days 1-2**: Environment setup, dependency analysis
- **Days 3-5**: PhantomJS to Puppeteer migration

### Week 2
- **Days 1-3**: Core dependency updates
- **Days 4-5**: Three.js submodule update and testing

### Week 3
- **Days 1-2**: Integration testing and bug fixes
- **Days 3-5**: Documentation and release preparation

## Breaking Changes & Migration Guide

### For Users

1. **Node.js Version Requirement**
   - **Old**: Node.js 8+ (estimated)
   - **New**: Node.js 16+ required

2. **Installation Changes**
   - May require additional system dependencies for Puppeteer
   - Updated installation instructions needed

### For Developers

1. **API Changes**
   - CoffeeScript code structure remains similar
   - Browser automation logic significantly different

2. **Build Process**
   - May need to rebuild native modules (sqlite3)
   - Updated npm scripts

## Success Metrics

1. **Functionality**: Generated docset contains all Three.js documentation
2. **Performance**: Generation time comparable or better than current
3. **Reliability**: No crashes during generation process
4. **Compatibility**: Works on Node.js 16, 18, and 20
5. **Security**: No high/critical security vulnerabilities

## Post-Update Maintenance

1. **Automated Updates**
   - Set up Dependabot or Renovate for dependency updates
   - Create CI/CD pipeline for testing

2. **Documentation**
   - Update README with new requirements
   - Create troubleshooting guide
   - Document build process

3. **Monitoring**
   - Track Three.js releases for future updates
   - Monitor security advisories for dependencies

## Alternative Approaches

### Option 1: Gradual Migration
- Update dependencies incrementally
- Lower risk, longer timeline

### Option 2: Complete Rewrite
- Rewrite in modern JavaScript/TypeScript
- Higher risk, more future-proof

### Option 3: Docker-First Approach
- Containerize the entire application
- Easier deployment, consistent environment

## Conclusion

This dependency update is critical for the project's continued viability. The primary challenge is replacing PhantomJS with a modern alternative while maintaining compatibility with the existing Three.js documentation scraping logic. Success will require careful testing and likely some iteration on the Three.js version compatibility.

**Recommended Priority**: High - Security and functionality issues make this update essential for continued use of the project.