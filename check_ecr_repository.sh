#!/bin/bash

# Retrieve all enabled AWS regions
regions=$(aws ec2 describe-regions --query "Regions[].RegionName" --output text)

# Loop through each region and check for the repository
for region in $regions; do
  echo "Checking region: $region"
  aws ecr describe-repositories \
    --region "$region" \
    --repository-names maturity-backend-dev \
    --output json 2>/dev/null
done
