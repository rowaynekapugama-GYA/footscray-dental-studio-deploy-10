# Blog image provenance

Where every image on the blog came from, and what still needs your decision.

## Summary

| Source | Count |
| --- | --- |
| Migrated from the old Ezy Dental Group media library | 59 |
| Newly generated to replace images the old site had lost | 8 |
| **Total** | **67** |

All 67 are self-hosted at `site/assets/img/blog/`. Nothing on the blog hot-links
to an external server, so nothing can break when the old site is retired.

## The 59 migrated images

These are the practice's own images, carried across from
`ezydentalgroup.com.au/wp-content/uploads/`. Ownership does not change: they
were the practice's before and they are the practice's now.

They were recovered in two passes. The first pulled 47 directly. The remaining
20 had been recorded against URLs the old site no longer serves, and a repair
pass found 12 of them by asking the WordPress REST API where each attachment
actually lived, or by scraping the original post page for its real `<img>` tags.
`blog-image-repair-report.csv` lists the exact source URL used for every file.

A note on resolution: 34 of these are between 300 and 350 pixels wide. That is
not a downscale on our side, it is the largest version the old site ever stored.
The template now renders any image under 600 pixels centred at its true size
rather than stretching it across the column, so they stay sharp instead of going
soft. If the practice still has the original camera files for any of them,
dropping one in under the same filename and rerunning `python3 build/blog.py` is
all it takes to upgrade.

## The 8 replacements

Eight images are gone from the old media library for good. Free stock libraries
(Pexels, Unsplash, Pixabay) are all blocked by the egress policy on the machine
this build runs on, so stock photography could not be sourced directly. These
eight are AI-generated editorial photographs instead, made to match the site's
existing look: natural window light, white and pale timber with muted navy,
shallow depth of field. They are installed and self-hosted like the rest, at
1024 x 688, 23 to 45 KB each.

| File | Post | What it shows |
| --- | --- | --- |
| `8-easy-steps-to-overcome-dental-anxiety-before-visiting-a-dentist.webp` | Overcoming dental anxiety | Patient sitting calmly in a dental chair while a clinician talks with them |
| `Teeth-Whitening-Sensitive-Teeth-professional.webp` | Professional teeth whitening | Dentist showing a patient a tooth shade guide |
| `aesthetic-and-appearance-issues-caused-by-gum-recession.webp` | Appearance issues from gum recession | Patient looking at her smile in a handheld mirror |
| `how-long-do-veneers-last.webp` | How long do veneers last | Porcelain veneer samples and a shade guide on a tray |
| `how-to-fix-rotten-teeth.webp` | How to fix rotten teeth | Dentist explaining a treatment plan using a dental model |
| `root-canal-cost-in-australia.webp` | Root canal cost in Australia | Dental treatment room laid out ready for a procedure |
| `sensitive-teeth.webp` | Sensitive teeth | Person wincing slightly while drinking iced water |
| `tooth-cavities-symptoms-causes-prevention.webp` | Tooth cavities | Dentist pointing out a molar on a dental model |

### Why none of them show teeth up close

Three of the originals were clinical close-ups: advanced decay, gum recession,
cavity pain during an examination. I deliberately did not recreate those.

A generated close-up of a diseased mouth is a fabricated clinical image. On a
dental practice site it reads as a real patient, which is the thing AHPRA's
advertising guidelines are most concerned about, and it would be a fabrication
we could never substantiate. Every replacement is instead a generic consultation
or lifestyle scene that carries the same editorial meaning without depicting a
clinical outcome. The alt text on those posts has been rewritten to describe
what is actually in the frame.

This is worth a moment of the client's attention before go-live. If they would
rather these eight were real photographs, there are two clean options:

1. **Practice photography.** Anything shot in the Footscray rooms would be
   better than either option here, and can be dropped in under the same
   filenames. This is the strongest option: it is unambiguously the practice's
   own, and it shows the actual rooms patients will walk into.
2. **Licensed stock.** Pexels and Unsplash both allow commercial use without
   attribution. Download, save over the matching file in
   `site/assets/img/blog/`, keep the filename, rerun `python3 build/blog.py`.

Either way nothing else in the build has to change.

## Rebuilding after any image swap

```bash
python3 build/blog.py
```

That re-reads each file and writes its real pixel dimensions into the markup,
which keeps the page from shifting while images load.
