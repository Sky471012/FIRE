import asyncio
import re
import time
from urllib.parse import urljoin, urlparse, urlunparse

# We no longer need aiohttp or BeautifulSoup
from playwright.async_api import async_playwright, Browser, Route, Error as PlaywrightError


def should_skip_path(path: str, skip_rules: list[str]) -> bool:
    """
    Advanced path filtering with pattern matching and negation.
    (This function is unchanged)
    """
    if not skip_rules:
        return False

    whitelist_rules = []
    blacklist_rules = []

    for rule in skip_rules:
        if rule.startswith('~/'):
            whitelist_rules.append(rule[1:])  # Keep the '/'
        else:
            blacklist_rules.append(rule)

    if whitelist_rules:
        matches_whitelist = False
        for pattern in whitelist_rules:
            if match_pattern(path, pattern):
                matches_whitelist = True
                break
        if not matches_whitelist:
            return True

    for pattern in blacklist_rules:
        if match_pattern(path, pattern):
            return True

    return False


def match_pattern(path: str, pattern: str) -> bool:
    """
    Match a path against a pattern with wildcard support.
    (This function is unchanged)
    """
    regex_pattern = re.escape(pattern)
    regex_pattern = regex_pattern.replace(r'\*', '.*')
    regex_pattern = regex_pattern.replace(r'\?', '.')
    regex_pattern = '^' + regex_pattern
    return bool(re.match(regex_pattern, path))


async def block_unwanted_resources(route: Route):
    """
    PERFORMANCE: Aborts requests for images, fonts, and stylesheets.
    """
    if route.request.resource_type in ["image", "stylesheet", "font", "media"]:
        await route.abort()
    else:
        await route.continue_()


async def worker(
        name: str,
        queue: asyncio.Queue,
        browser: Browser,  # We now pass the browser instance
        visited: set,
        found_links: set,
        base_domain: str,
        max_depth: int,
        skip_rules: list[str]
):
    """
    A worker task that consumes URLs, opens them in a *real browser page*,
    waits for JS to render, and then scrapes links.
    """
    while True:
        current_url, current_depth = await queue.get()
        page = None
        task_done_called = False

        try:
            if current_depth > max_depth:
                continue

            # Use a new browser page for each URL
            page = await browser.new_page()

            # --- PERFORMANCE: Block non-essential resources ---
            await page.route("**/*", block_unwanted_resources)

            print(f"[Worker {name} | Depth {current_depth}] Crawling: {current_url}")
            found_links.add(current_url)

            # --- THIS IS THE MAGIC ---
            # .goto() fetches the page, runs all JS, and waits for it to load
            await page.goto(current_url, wait_until="load", timeout=20000)

            # --- NEW PARSING ---
            # Use Playwright's locators to find all links
            links_on_page = await page.locator("a[href]").all()

            new_depth = current_depth + 1
            if new_depth > max_depth:
                continue

            for link_element in links_on_page:
                href = await link_element.get_attribute("href")
                if not href:
                    continue

                absolute_link = urljoin(current_url, href)
                parsed_link = urlparse(absolute_link)
                normalized_link = urlunparse((
                    parsed_link.scheme,
                    parsed_link.netloc,
                    parsed_link.path,
                    parsed_link.params,
                    parsed_link.query,
                    ''  # No fragment
                ))

                new_path = parsed_link.path
                if not new_path:
                    new_path = "/"

                # --- HOST ENFORCEMENT ---
                is_in_domain = urlparse(normalized_link).netloc == base_domain
                is_valid_scheme = parsed_link.scheme in ('http', 'https')
                is_not_visited = normalized_link not in visited

                # --- PATH FILTERING ---
                should_skip = should_skip_path(new_path, skip_rules)

                if (is_in_domain and
                        is_valid_scheme and
                        is_not_visited and
                        not should_skip):
                    visited.add(normalized_link)
                    await queue.put((normalized_link, new_depth))

        except asyncio.CancelledError:
            # Graceful shutdown on cancellation
            # print(f"[Worker {name}] Cancelled, shutting down gracefully...")
            try:
                if page and not page.is_closed():
                    await page.close()
            except Exception:
                pass  # Ignore errors when closing during cancellation
            queue.task_done()
            task_done_called = True
            break  # Exit the worker loop
        except PlaywrightError as e:
            # Handle browser/page closed errors (common during shutdown)
            error_msg = str(e)
            if "closed" in error_msg.lower():
                # Browser or page was closed, likely due to cancellation
                # print(f"[Worker {name}] Page/browser closed during operation")
                pass
            else:
                print(f"[Error] Worker {name} Playwright error on {current_url}: {e}")
        except Exception as e:
            print(f"[Error] Worker {name} failed on {current_url}: {e}")
        finally:
            # Close page if it wasn't closed in the exception handler
            try:
                if page and not page.is_closed():
                    await page.close()
            except Exception:
                pass  # Page might already be closed or browser shut down

            if not task_done_called:
                queue.task_done()


async def crawl_website(
        start_url: str,
        max_depth: int,
        max_browsers: int,  # Renamed for clarity
        skip_rules: list[str]
) -> set:
    """
    Crawls a website using Playwright and returns a set of {url}.
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
            ''  # No fragment
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

    async with async_playwright() as p:
        # We launch a single browser (Chromium) and share it
        browser = await p.chromium.launch(headless=True)
        print(f"Browser launched (Headless)...")

        # We don't need RobotFileParser, Playwright respects robots.txt by default
        # But for a custom crawler, we'll rely on our own logic.

        workers = []
        try:
            workers = [
                asyncio.create_task(
                    worker(
                        f"worker-{i + 1}",
                        queue, browser,
                        visited, found_links, base_domain, max_depth,
                        skip_rules
                    )
                ) for i in range(max_browsers)
            ]

            await queue.join()

        except asyncio.CancelledError:
            print("\n[Crawl] Cancellation detected, cleaning up...")
            raise
        finally:
            # Cancel all workers first
            print("[Crawl] Cancelling workers...")
            for task in workers:
                if not task.done():
                    task.cancel()

            # Wait for all workers to finish (with a timeout)
            try:
                await asyncio.wait_for(
                    asyncio.gather(*workers, return_exceptions=True),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                print("[Crawl] Worker cleanup timed out")

            # Give a small moment for any pending operations to complete
            await asyncio.sleep(0.5)

            # Now close browser
            try:
                await browser.close()
                print("[Crawl] Browser closed successfully")
            except Exception as _:
                # Silently ignore browser close errors during shutdown
                pass

    return found_links


async def main():
    # --- Configuration ---
    STARTING_URL = "https://threejs.org/manual/#en/installation"
    # STARTING_URL = "https://nextjs.org/docs"
    MAX_DEPTH = 2

    # --- IMPORTANT ---
    # This is NOT concurrent requests. This is full browsers.
    # Keep this number LOW (2-5) or your computer will run out of RAM.
    MAX_CONCURRENT_BROWSERS = 10

    SKIP_RULES = [
        "~/docs/*",
        "/docs/pages/*"
    ]

    print(f"--- Starting JS-Enabled crawl at {STARTING_URL} up to depth {MAX_DEPTH} ---")
    print(f"--- Using {MAX_CONCURRENT_BROWSERS} parallel browser workers ---")
    if SKIP_RULES:
        print(f"--- Using {len(SKIP_RULES)} path filtering rules ---")
        for rule in SKIP_RULES:
            if rule.startswith('~/'):
                print(f"  [WHITELIST] {rule}")
            else:
                print(f"  [BLACKLIST] {rule}")

    start_time = time.time()
    all_found_links = set()

    try:
        all_found_links = await crawl_website(
            STARTING_URL,
            MAX_DEPTH,
            MAX_CONCURRENT_BROWSERS,
            SKIP_RULES
        )
        end_time = time.time()

        print("\n--- Crawl Complete ---")
        print(f"Time taken: {end_time - start_time:.2f} seconds")
        print(f"Found {len(all_found_links)} unique, crawlable links:")

    except (KeyboardInterrupt, asyncio.CancelledError):
        end_time = time.time()
        print("\n\n--- Crawl interrupted by user ---")
        print(f"Time taken: {end_time - start_time:.2f} seconds")
        print(f"Found {len(all_found_links)} unique links before interruption:")

    # Save links regardless of whether crawl completed or was interrupted
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
        print("\n--- Shutdown complete ---")
