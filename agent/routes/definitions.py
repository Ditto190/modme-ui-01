"""
Route definitions for semantic routing in ModMe GenUI Workbench.

This module defines the core routes used for multi-agent orchestration.
Each route represents a distinct agent capability with diverse utterances
to ensure accurate intent classification.
"""

from semantic_router import Route

# Dashboard Generation Route
dashboard_route = Route(
    name="dashboard",
    utterances=[
        "show me a dashboard",
        "create a KPI view",
        "I need metrics visualization",
        "display business analytics",
        "build a reporting interface",
        "show performance indicators",
        "dashboard with key metrics",
        "analytics overview",
        "create a management dashboard",
        "build me a dashboard showing sales performance",
    ],
)

# Data Query Route
data_query_route = Route(
    name="data_query",
    utterances=[
        "query the database",
        "fetch data from customers table",
        "run SQL on sales",
        "get all records where status is active",
        "filter orders by date range",
        "show me users who signed up last month",
        "retrieve transaction history",
        "pull data for Q4 analysis",
        "extract data from the orders table",
        "give me all entries matching this criteria",
    ],
)

# Visualization/Chart Route
visualization_route = Route(
    name="visualization",
    utterances=[
        "create a bar chart",
        "show me a line graph",
        "plot sales over time",
        "visualize revenue trends",
        "make a pie chart of categories",
        "graph the monthly performance",
        "chart customer growth",
        "display data as a scatter plot",
        "generate a histogram of prices",
        "show me a time series visualization",
    ],
)

# Component Selection Route
component_route = Route(
    name="component",
    utterances=[
        "add a stat card",
        "insert a data table component",
        "use the chart widget",
        "place a metric card here",
        "add a KPI indicator",
        "show me available components",
        "which UI elements can I use",
        "add a button component",
        "insert a form field",
        "use the card layout component",
    ],
)

# Analysis Route
analysis_route = Route(
    name="analysis",
    utterances=[
        "analyze sales trends",
        "find correlations in the data",
        "what patterns do you see",
        "identify outliers",
        "perform regression analysis",
        "calculate moving averages",
        "detect anomalies in transactions",
        "compare year over year growth",
        "show me the statistical summary",
        "analyze customer behavior patterns",
    ],
)

# Audit & Compliance Route
audit_route = Route(
    name="audit",
    utterances=[
        "log this action",
        "create an audit trail",
        "track compliance changes",
        "record this operation",
        "show me the audit log",
        "who made changes to this record",
        "compliance report for last month",
        "track all modifications",
        "generate an audit summary",
        "verify compliance with regulations",
    ],
)

# Multimodal Processing Route
multimodal_route = Route(
    name="multimodal",
    utterances=[
        "analyze this image",
        "extract text from document",
        "process this PDF file",
        "what's in this picture",
        "read the contents of this screenshot",
        "transcribe this audio",
        "scan this document",
        "identify objects in the image",
        "convert this image to data",
        "extract information from this attachment",
    ],
)

# Chitchat/Conversational Fallback Route
chitchat_route = Route(
    name="chitchat",
    utterances=[
        "hello",
        "hi there",
        "how are you",
        "what can you do",
        "tell me about yourself",
        "good morning",
        "thanks",
        "thank you",
        "that's helpful",
        "nice work",
    ],
)

# Export all routes
ALL_ROUTES = [
    dashboard_route,
    data_query_route,
    visualization_route,
    component_route,
    analysis_route,
    audit_route,
    multimodal_route,
    chitchat_route,
]
