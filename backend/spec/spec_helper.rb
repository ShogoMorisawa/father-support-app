# frozen_string_literal: true

RSpec.configure do |config|
    config.expect_with :rspec do |c|
      c.syntax = :expect
    end

    # テストごとにDBをロールバック
    config.order = :random
    Kernel.srand config.seed
  end
