import scrapy


class ScrapePageItem(scrapy.Item):
    job_id = scrapy.Field()
    url = scrapy.Field()
    content_hash = scrapy.Field()
    html = scrapy.Field()
    extracted_text = scrapy.Field()
    status = scrapy.Field()
    metadata = scrapy.Field()
