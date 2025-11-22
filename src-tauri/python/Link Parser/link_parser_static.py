import asyncio
import re
import time
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import aiohttp
from bs4 import BeautifulSoup


def should_skip_path(path: str, skip_rules: list[str]) -> bool:
    """
    Advanced path filtering with pattern matching and negation.

    Rules:
    - ~/pattern : NEGATED - skip all paths that do NOT match this pattern (whitelist)
    - /pattern : Skip paths that match this pattern (blacklist)
    - Patterns support wildcards: * (any characters), ? (single character)

    Returns True if the path should be skipped, False otherwise.
    """
    if not skip_rules:
        return False

    # Separate negated (whitelist) and normal (blacklist) rules
    whitelist_rules = []
    blacklist_rules = []

    for rule in skip_rules:
        if rule.startswith('~/'):
            # --- THIS IS THE FIX ---
            # Negated rule - whitelist
            # We remove just '~' [1:], not '~/' [2:].
            # We need to keep the '/' for path matching.
            whitelist_rules.append(rule[1:])
        else:
            # Normal rule - blacklist
            blacklist_rules.append(rule)

    # If whitelist rules exist, path MUST match at least one of them
    if whitelist_rules:
        matches_whitelist = False
        for pattern in whitelist_rules:
            if match_pattern(path, pattern):
                matches_whitelist = True
                break

        if not matches_whitelist:
            # Path doesn't match any whitelist rule, so skip it
            # print(f"[Whitelist Skip] Path '{path}' did not match: {whitelist_rules}") # Debug line
            return True

    # Check blacklist rules - if any match, skip the path
    for pattern in blacklist_rules:
        if match_pattern(path, pattern):
            # print(f"[Blacklist Skip] Path '{path}' matched: {pattern}") # Debug line
            return True

    return False


def match_pattern(path: str, pattern: str) -> bool:
    """
    Match a path against a pattern with wildcard support.
    * matches any characters
    ? matches a single character
    """
    # Convert glob-style pattern to regex
    # Escape special regex characters except * and ?
    regex_pattern = re.escape(pattern)
    # Replace escaped wildcards with regex equivalents
    regex_pattern = regex_pattern.replace(r'\*', '.*')
    regex_pattern = regex_pattern.replace(r'\?', '.')
    # Match from the start of the path
    regex_pattern = '^' + regex_pattern

    return bool(re.match(regex_pattern, path))


async def fetch(session: aiohttp.ClientSession, url: str) -> str:
    """
    Asynchronously fetches a single URL (using the session's headers)
    and returns its text content. Returns an empty string on failure.
    """
    try:
        async with session.get(url, timeout=15) as response:
            response.raise_for_status()
            content_type = response.headers.get('Content-Type', '')
            if 'text/html' not in content_type:
                # print(f"[Skipping] Non-HTML content: {url}") # Too noisy
                return ""
            return await response.text()
    except asyncio.TimeoutError:
        print(f"[Error] Timeout for {url}")
        return ""
    except Exception as e:
        print(f"[Error] fetch failed for {url}: {e}")
        return ""

def parse_links(
        html_content: str,
        current_url: str,
        base_domain: str,
        skip_rules: list[str]
) -> set[str]:
    """
    (Synchronous) Parses HTML content and extracts valid, filtered links.
    This function is designed to be run in an executor to avoid
    blocking the asyncio event loop.
    """
    links_found_on_page = set()

    # --- PERFORMANCE FIX: Use the much faster 'lxml' parser ---
    try:
        soup = BeautifulSoup(html_content, 'lxml')
    except Exception as e:
        print(f"[Parser Error] Failed to parse {current_url} with lxml: {e}")
        return links_found_on_page

    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        absolute_link = urljoin(current_url, href)
        parsed_link = urlparse(absolute_link)
        normalized_link = urlunparse((
            parsed_link.scheme,
            parsed_link.netloc,
            parsed_link.path,
            parsed_link.params,
            parsed_link.query,
            '' # No fragment
        ))

        new_path = parsed_link.path
        if not new_path:
            new_path = "/"

        is_in_domain = urlparse(normalized_link).netloc == base_domain
        is_valid_scheme = parsed_link.scheme in ('http', 'https')

        # --- ADVANCED PATH FILTERING ---
        should_skip = should_skip_path(new_path, skip_rules)

        if (is_in_domain and
                is_valid_scheme and
                not should_skip):

            links_found_on_page.add(normalized_link)

    return links_found_on_page


async def worker(
        name: str,
        queue: asyncio.Queue,
        session: aiohttp.ClientSession,
        rp: RobotFileParser,
        user_agent: str, # Still needed for rp.can_fetch
        visited: set,
        found_links: set,
        base_domain: str,
        max_depth: int,
        semaphore: asyncio.Semaphore,
        skip_rules: list[str] # <-- Advanced path filtering rules
):
    """
    A worker task that consumes URLs from the queue, fetches them,
    and delegates parsing to an executor.
    """
    loop = asyncio.get_running_loop()

    while True:
        try:
            current_url, current_depth = await queue.get()

            if not rp.can_fetch(user_agent, current_url):
                print(f"[Disallowed] robots.txt disallows: {current_url}")
                queue.task_done()
                continue

            if current_depth > max_depth:
                queue.task_done()
                continue

            print(f"[Worker {name} | Depth {current_depth}] Crawling: {current_url}") # Noisy
            found_links.add(current_url)

            async with semaphore:
                html_content = await fetch(session, current_url)

                # --- PERFORMANCE FIX: Removed the politeness bottleneck ---
                # await asyncio.sleep(0.1) # <-- REMOVED

            if not html_content:
                queue.task_done()
                continue

            # --- PERFORMANCE FIX: Run the blocking parser in an executor ---
            new_links_from_page = await loop.run_in_executor(
                None,  # Use default ThreadPoolExecutor
                parse_links, # The synchronous parse function
                # --- Arguments for parse_links ---
                html_content,
                current_url,
                base_domain,
                skip_rules
            )

            # --- Process the results from the parser ---
            # --- OPTIMIZATION: Check depth *before* adding to queue ---
            new_depth = current_depth + 1
            if new_depth <= max_depth:
                for link in new_links_from_page:
                    if link not in visited:
                        visited.add(link)
                        await queue.put((link, new_depth))

            queue.task_done()
        except Exception as e:
            print(f"Unexpected error in worker {name}: {e}")
            queue.task_done()

async def crawl_website(
        start_url: str,
        max_depth: int,
        max_concurrent: int,
        skip_rules: list[str]
) -> set:
    """
    Crawls a website and returns a set of {url}.
    """
    queue = asyncio.Queue()
    visited = set()
    found_links = set()

    try:
        parsed_start_url = urlparse(start_url)
        normalized_start_url = urlunparse((
            parsed_start_url.scheme,
            parsed_start_url.netloc,
            parsed_start_url.path,
            parsed_start_url.params,
            parsed_start_url.query,
            '' # No fragment
        ))
        base_domain = parsed_start_url.netloc


        if not base_domain:
            print(f"Error: Invalid start URL: {start_url}")
            return found_links

    except ValueError as e:
        print(f"Error: Invalid start URL provided '{start_url}'. {e}")
        return found_links

    await queue.put((normalized_start_url, 0))
    visited.add(normalized_start_url)

    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
    headers = {"User-Agent": user_agent}
    print(f"Using User-Agent: {user_agent}")

    robots_url = f"{parsed_start_url.scheme}://{base_domain}/robots.txt"
    rp = RobotFileParser()
    rp.set_url(robots_url)

    semaphore = asyncio.Semaphore(max_concurrent)

    async with aiohttp.ClientSession(headers=headers) as session:
        try:
            async with session.get(robots_url, timeout=10) as resp:
                if resp.status == 200:
                    print("Successfully fetched and parsed robots.txt")
                    rp.parse(await resp.text())
                else:
                    print(f"Warning: robots.txt not found or unreadable (Status: {resp.status}). Forcing allow-all.")
                    rp.parse("User-agent: *\nAllow: /".splitlines())
        except Exception as e:
            print(f"Warning: Could not fetch robots.txt. {e}. Forcing allow-all.")
            rp.parse("User-agent: *\nAllow: /".splitlines())

        workers = [
            asyncio.create_task(
                worker(
                    f"worker-{i+1}",
                    queue, session, rp, user_agent, # Pass user_agent string
                    visited, found_links, base_domain, max_depth, semaphore,
                    skip_rules # <-- Pass new parameter
                )
            ) for i in range(max_concurrent)
        ]

        await queue.join()

        for task in workers:
            task.cancel()
        await asyncio.gather(*workers, return_exceptions=True)

    return found_links


async def main():
    # --- Configuration ---
    STARTING_URL = "https://en.wikipedia.org/wiki/Computer_science"
    MAX_DEPTH = 100
    MAX_CONCURRENT_REQUESTS = 15

    SKIP_RULES = [
    ]

    print(f"--- Starting async crawl at {STARTING_URL} up to depth {MAX_DEPTH} ---")
    if SKIP_RULES:
        print(f"--- Using {len(SKIP_RULES)} path filtering rules ---")
        for rule in SKIP_RULES:
            if rule.startswith('~/'):
                print(f"  [WHITELIST] {rule}")
            else:
                print(f"  [BLACKLIST] {rule}")

    start_time = time.time()
    all_found_links = await crawl_website(
        STARTING_URL,
        MAX_DEPTH,
        MAX_CONCURRENT_REQUESTS,
        SKIP_RULES
    )
    end_time = time.time()

    print("\n--- Crawl Complete ---")
    print(f"Time taken: {end_time - start_time:.2f} seconds")
    print(f"Found {len(all_found_links)} unique, crawlable links:")

    output_filename = "crawled_links.txt"
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            for link in sorted(list(all_found_links)):
                f.write(f"{link}\n")
        print(f"\nSuccessfully saved links to {output_filename}")
    except IOError as e:
        print(f"\nError: Could not write links to file {output_filename}. {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n--- Crawl interrupted by user ---")
