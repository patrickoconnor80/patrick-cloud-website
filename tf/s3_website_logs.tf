resource "aws_s3_bucket" "website_logs" {
  bucket        = "${local.prefix}-website-logs"
  force_destroy = true

  tags = merge(local.tags, {
    Name = "${local.prefix}-website-logs"
  })
}

resource "aws_s3_bucket_ownership_controls" "website_logs" {
  bucket = aws_s3_bucket.website_logs.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "website_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.website_logs]

  bucket = aws_s3_bucket.website_logs.id
  acl    = "private"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website_logs" {
  bucket = aws_s3_bucket.website_logs.bucket

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "website_logs" {
  bucket                  = aws_s3_bucket.website_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
  depends_on              = [aws_s3_bucket.website_logs]
}

resource "aws_s3_bucket_versioning" "website_logs" {
  bucket = aws_s3_bucket.website_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "website_logs" {
  bucket = aws_s3_bucket.website_logs.id

  rule {
    id = "log"
    status = "Enabled"
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    expiration {
      days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 60
      storage_class = "GLACIER"
    }
  }
}


## BUCKET POLICY ##

resource "aws_s3_bucket_policy" "website_logs" {
  bucket     = aws_s3_bucket.website_logs.id
  policy     = data.aws_iam_policy_document.website_logs_bucket_policy.json
  depends_on = [aws_s3_bucket_public_access_block.website_logs]
}

data "aws_iam_policy_document" "website_logs_bucket_policy" {
      statement {
        sid    = "ReadBucketMetadata"
        effect = "Allow"
        principals {
          type        = "AWS"
          identifiers = [data.aws_elb_service_account.main.arn]
        }
        actions = [
          "s3:ListBucket"
        ]
        resources = [aws_s3_bucket.website_logs.arn]
      }

      statement {
        sid = "TerraformDeployer"
        effect    = "Allow"
        principals {
          type ="AWS"
          identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.prefix}-jenkins-ec2-role"]
        }
        actions = [
          "s3:ListBucket",
          "s3:GetBucketPolicy",
          "s3:GetBucketAcl"
        ]
        resources = [
          "${aws_s3_bucket.website_logs.arn}"
        ]
      }

      statement {
        sid    = "WriteToBucket"
        effect = "Allow"
        principals {
          type        = "AWS"
          identifiers = [data.aws_elb_service_account.main.arn]
        }
        actions = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        resources = ["${aws_s3_bucket.website_logs.arn}/alb/*"]
      }

      statement {
        sid    = "AdminAccessToBucket"
        effect = "Allow"
        principals {
          type        = "AWS"
          identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
        }
        actions = ["s3:*"]
        resources = ["${aws_s3_bucket.website_logs.arn}/*","${aws_s3_bucket.website_logs.arn}"]
      }
}


## ALARMS ##

resource "aws_cloudwatch_metric_alarm" "s3_4xxErrors" {
  alarm_name          = "${local.prefix}-website-logs-4xxErrors-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 15
  metric_name         = "4xxErrors"
  namespace           = "AWS/S3"
  period              = 60
  statistic           = "Average"
  threshold           = ".05"
  datapoints_to_alarm = 15
  alarm_description   = "This alarm helps us report the total number of 4xx error status codes that are made in response to client requests. 403 error codes might indicate an incorrect IAM policy, and 404 error codes might indicate mis-behaving client application"
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    BucketName = "${local.prefix}-website-logs"
    FilterId   = "EntireBucket"
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "s3_5xxErrors" {
  alarm_name          = "${local.prefix}-website-logs-5xxErrors-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 15
  metric_name         = "5xxErrors"
  namespace           = "AWS/S3"
  period              = 60
  statistic           = "Average"
  threshold           = ".05"
  datapoints_to_alarm = 15
  alarm_description   = "This alarm helps you detect a high number of server-side errors. These errors indicate that a client made a request that the server couldn’t complete."
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    BucketName = "${local.prefix}-website-logs"
    FilterId   = "EntireBucket"
  }

  tags = local.tags
}
