"""Quick utility to check spans in a Phoenix project."""
import sys
import phoenix as px

project = sys.argv[1] if len(sys.argv) > 1 else "copilot-research-n8n"
client = px.Client()
df = client.get_spans_dataframe(project_name=project)

print(f"Project: {project}")
print(f"Total spans: {len(df)}")

if len(df) > 0:
    print(f"\nSpan kinds:")
    if "attributes.openinference.span.kind" in df.columns:
        print(df["attributes.openinference.span.kind"].value_counts().to_string())

    print(f"\nSample span names (first 5):")
    for name in df["name"].head(5):
        print(f"  {name}")
