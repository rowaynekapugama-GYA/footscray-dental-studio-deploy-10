"""Build the full Footscray Dental Studio static site."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from common import OUT, FAVICON_SVG
import core, services, utility

def main():
    (OUT / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    print("wrote favicon.svg")
    core.home_page()
    core.about_page()
    core.offers_page()
    core.book_page()
    core.contact_page()
    services.build_all_services()
    utility.build_utility()
    n = len(list(OUT.rglob("index.html"))) + len(list(OUT.glob("404.html")))
    print(f"\nDone — {n} pages built.")

if __name__ == "__main__":
    main()
