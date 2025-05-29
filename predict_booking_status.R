# Load necessary libraries
if (!require("pacman")) install.packages("pacman")
pacman::p_load(caret, pROC, randomForest, dplyr)

# Set seed for reproducibility
set.seed(123)

# Load the training data
# Assuming the train.csv file is in a subdirectory named 'data' relative to the script's location
# Adjust the path if your file structure is different.
# For example, if train.csv is in the same directory as the R script:
# train_data_full <- read.csv("train.csv", stringsAsFactors = FALSE, na.strings = c("", "NA", "NULL"))
# If it's in a specific path provided during execution:
# train_data_full <- read.csv("/Users/strumasager/Downloads/StrumaSager_PISCATAWAY_NJ_Project_10/data/train.csv", stringsAsFactors = FALSE, na.strings = c("", "NA", "NULL"))
# For a more robust path relative to the project, you might use the 'here' package or construct paths carefully.
# For this example, let's assume it's in a 'data' subdirectory.
# If this script is in /app, and data is in /app/data/train.csv
data_path <- "data/train.csv"
if (!file.exists(data_path)) {
  # Fallback path if not in /app/data, try /app (common for execution environments)
  data_path <- "train.csv"
  if (!file.exists(data_path)) {
    stop("train.csv not found. Please check the path.")
  }
}
train_data_full <- read.csv(data_path, stringsAsFactors = FALSE, na.strings = c("", "NA", "NULL"))

# --- Preprocessing ---
# Convert booking_status to a factor (0 and 1)
train_data_full$booking_status <- as.factor(train_data_full$booking_status)

# Convert date columns to Date objects and extract features (example)
# This requires knowing the exact names of your date columns.
# Assuming 'date_of_booking' and 'date_of_checked_in' exist and are in a consistent format.
# If formats are inconsistent, more robust parsing (e.g., with lubridate) is needed.
date_cols <- c("date_of_booking", "date_of_checked_in")
for (col in date_cols) {
  if (col %in% names(train_data_full)) {
    train_data_full[[col]] <- as.Date(train_data_full[[col]], errors = "coerce") # errors='coerce' will turn unparseable dates to NA
    train_data_full[[paste0(col, "_year")]] <- as.numeric(format(train_data_full[[col]], "%Y"))
    train_data_full[[paste0(col, "_month")]] <- as.numeric(format(train_data_full[[col]], "%m"))
    train_data_full[[paste0(col, "_dayofweek")]] <- as.numeric(factor(weekdays(train_data_full[[col]]), levels = c("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")))
    train_data_full[[col]] <- NULL # Remove original date column after feature extraction
  }
}

# Impute NA values for age_group and age_default
# Convert to numeric first, coercing errors to NA
train_data_full$age_group <- as.numeric(as.character(train_data_full$age_group))
train_data_full$age_default <- as.numeric(as.character(train_data_full$age_default))

# Impute NAs with the mean (after ensuring they are numeric)
train_data_full$age_group[is.na(train_data_full$age_group)] <- mean(train_data_full$age_group, na.rm = TRUE)
train_data_full$age_default[is.na(train_data_full$age_default)] <- mean(train_data_full$age_default, na.rm = TRUE)

# Identify character columns to convert to factors (excluding ID or high cardinality text if any)
# For simplicity, convert all character columns to factors. Review for high cardinality.
char_cols <- names(train_data_full)[sapply(train_data_full, is.character)]
for (col in char_cols) {
  train_data_full[[col]] <- as.factor(train_data_full[[col]])
}

# Remove columns with a very high number of missing values (e.g., > 50%)
missing_threshold <- 0.5 * nrow(train_data_full)
cols_to_remove_missing <- names(train_data_full)[sapply(train_data_full, function(x) sum(is.na(x)) > missing_threshold)]
if (length(cols_to_remove_missing) > 0) {
  print(paste("Removing columns with >50% missing values:", paste(cols_to_remove_missing, collapse=", ")))
  train_data_full <- train_data_full[, !(names(train_data_full) %in% cols_to_remove_missing)]
}

# Impute remaining NAs for numeric columns with mean, and for factor columns with mode
# Numeric imputation
numeric_cols_with_na <- names(train_data_full)[sapply(train_data_full, function(x) is.numeric(x) && any(is.na(x)))]
for (col in numeric_cols_with_na) {
  train_data_full[[col]][is.na(train_data_full[[col]])] <- mean(train_data_full[[col]], na.rm = TRUE)
}

# Factor imputation (Mode)
get_mode <- function(v) {
  uniqv <- unique(v[!is.na(v)])
  uniqv[which.max(tabulate(match(v, uniqv)))]
}
factor_cols_with_na <- names(train_data_full)[sapply(train_data_full, function(x) is.factor(x) && any(is.na(x)))]
for (col in factor_cols_with_na) {
  if (length(unique(train_data_full[[col]][!is.na(train_data_full[[col]])])) > 0) { # Ensure there are non-NA values
    train_data_full[[col]][is.na(train_data_full[[col]])] <- get_mode(train_data_full[[col]])
  } else {
    # Handle cases where all values are NA for a factor (e.g., convert to a default level or remove column)
    print(paste("Warning: Factor column", col, "has all NA values after initial NA handling. Consider removing or specific imputation."))
    # For now, let's add a placeholder level if it's completely NA, though removing might be better
    levels(train_data_full[[col]]) <- c(levels(train_data_full[[col]]), "Unknown")
    train_data_full[[col]][is.na(train_data_full[[col]])] <- "Unknown"
  }
}


# Remove columns with only one unique value (zero variance) after NA imputation
cols_to_remove_zerovar <- names(train_data_full)[sapply(train_data_full, function(x) length(unique(x)) == 1)]
if (length(cols_to_remove_zerovar) > 0) {
  print(paste("Removing columns with zero variance:", paste(cols_to_remove_zerovar, collapse=", ")))
  train_data_full <- train_data_full[, !(names(train_data_full) %in% cols_to_remove_zerovar)]
}


# Ensure booking_status is the last column for some caret functions if needed, or handle explicitly
target_col <- "booking_status"
if (target_col %in% names(train_data_full)) {
    train_data_full <- train_data_full %>% select(-all_of(target_col), all_of(target_col))
} else {
    stop("Target column 'booking_status' not found in the dataset.")
}


# Check for any remaining NAs
#na_counts <- sapply(train_data_full, function(x) sum(is.na(x)))
#print("NA counts after imputation:")
#print(na_counts[na_counts > 0])
#if (any(na_counts > 0)) {
#  stop("NA values still present after imputation. Please check preprocessing steps.")
#}

# --- Data Splitting ---
train_index <- createDataPartition(train_data_full$booking_status, p = 0.7, list = FALSE)
train_set <- train_data_full[train_index, ]
test_set <- train_data_full[-train_index, ]

print("Dimensions of full data:")
print(dim(train_data_full))
print("Dimensions of training set:")
print(dim(train_set))
print("Dimensions of test set:")
print(dim(test_set))

# --- Model Training & Evaluation ---

# Define cross-validation settings
ctrl <- trainControl(method = "cv", number = 5, classProbs = TRUE, summaryFunction = twoClassSummary, allowParallel = TRUE)

# Logistic Regression
print("Training Logistic Regression model...")
tryCatch({
  log_model <- train(
    booking_status ~ .,
    data = train_set,
    method = "glm",
    family = "binomial",
    trControl = ctrl,
    metric = "ROC" # AUC is referred to as ROC in caret for twoClassSummary
  )
  print(log_model)
  
  # Predictions and Evaluation
  log_pred_prob <- predict(log_model, newdata = test_set, type = "prob")[, "1"] # Probability of class '1'
  log_pred_class <- predict(log_model, newdata = test_set)
  
  log_roc <- roc(test_set$booking_status, log_pred_prob)
  print(paste("Logistic Regression Test AUC:", auc(log_roc)))
  
  log_cm <- confusionMatrix(data = log_pred_class, reference = test_set$booking_status, positive = "1")
  print("Logistic Regression Confusion Matrix:")
  print(log_cm)
  
}, error = function(e) {
  print(paste("Error in Logistic Regression:", e$message))
  # Handle cases where glm might fail due to collinearity or other issues
  # For example, try removing problematic predictors
  # For now, just printing the error
  print("Skipping Logistic Regression due to error.")
})


# Random Forest
print("Training Random Forest model...")
tryCatch({
  # Tune mtry for Random Forest
  # Reduced tuneLength for quicker execution in this example
  tuneGrid_rf <- expand.grid(.mtry = c(2, 5, 10, min(15, ncol(train_set)-1))) # Ensure mtry is not > number of predictors
  
  rf_model <- train(
    booking_status ~ .,
    data = train_set,
    method = "rf",
    trControl = ctrl,
    tuneGrid = tuneGrid_rf,
    ntree = 200, # Reduced ntree for faster execution, default is 500
    metric = "ROC",
    importance = TRUE,
    allowParallel = TRUE 
  )
  print(rf_model)
  
  # Predictions and Evaluation
  rf_pred_prob <- predict(rf_model, newdata = test_set, type = "prob")[, "1"]
  rf_pred_class <- predict(rf_model, newdata = test_set)
  
  rf_roc <- roc(test_set$booking_status, rf_pred_prob)
  print(paste("Random Forest Test AUC:", auc(rf_roc)))
  
  rf_cm <- confusionMatrix(data = rf_pred_class, reference = test_set$booking_status, positive = "1")
  print("Random Forest Confusion Matrix:")
  print(rf_cm)
  
  print("Random Forest Variable Importance:")
  print(varImp(rf_model))
  
}, error = function(e) {
  print(paste("Error in Random Forest:", e$message))
  print("Skipping Random Forest due to error.")
})

print("Script finished.")

# To make predictions on a new, unseen test dataset (e.g., 'test.csv' from a competition)
# 1. Load test_new_data <- read.csv("path/to/your/test.csv", stringsAsFactors = FALSE, na.strings = c("", "NA", "NULL"))
# 2. Apply THE EXACT SAME PREPROCESSING STEPS to test_new_data as done for train_data_full.
#    - This includes date conversions, NA imputation (using means/modes *from the training set*), factor conversions, etc.
#    - Ensure test_new_data has the same columns in the same order as train_set (excluding target variable).
# 3. Make predictions:
#    final_predictions_prob <- predict(rf_model, newdata = test_new_data_processed, type = "prob")[, "1"]
#    final_predictions_class <- predict(rf_model, newdata = test_new_data_processed)
# 4. Format for submission as required by the competition/project.
#    submission_df <- data.frame(ID_Column = test_new_data$ID_Column, booking_status = final_predictions_class) # or probabilities
#    write.csv(submission_df, "submission.csv", row.names = FALSE)

# Example for handling new test data (conceptual, needs actual test data and column names)
# test_actual_data <- read.csv("path_to_actual_test_file.csv", stringsAsFactors = FALSE, na.strings = c("", "NA", "NULL"))
# Preprocess test_actual_data identically to train_data_full
# ... (ensure all transformations, imputations using training set parameters, factor level alignments)
# Make sure the test set has the same factor levels as the training set for all factor columns.
# One way to do this is to combine train and test before factor conversion, then split.
# Or, more carefully, save training set factor levels and apply them to the test set.

# For example, if 'some_factor_col' was in train_set:
# levels_train_some_factor_col <- levels(train_set$some_factor_col)
# test_actual_data$some_factor_col <- factor(test_actual_data$some_factor_col, levels = levels_train_some_factor_col)
# Handle NAs that might arise if test set has new levels not in training set.

# rf_final_predictions <- predict(rf_model, newdata = test_actual_data_processed, type = "prob")[, "1"]
# submission_file <- data.frame(Booking_ID = test_actual_data$Booking_ID, booking_status = rf_final_predictions)
# write.csv(submission_file, "my_submission.csv", row.names = FALSE)
